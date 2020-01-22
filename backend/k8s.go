package main

import (
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	extensionsv1beta1 "k8s.io/api/extensions/v1beta1"
	v1beta1 "k8s.io/api/networking/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	kubernetes "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type k8sState struct {
	Ingresses           []v1beta1.Ingress           `json:"ingresses"`
	IngressesExtensions []extensionsv1beta1.Ingress `json:"ingressesExtension"`
	Pods                []corev1.Pod                `json:"pods"`
	Services            []corev1.Service            `json:"services"`
	Timestamp           time.Time                   `json:"timestamp"`
}

var (
	clientset    *kubernetes.Clientset = connect()
	state        k8sState              = loadK8sState()
	stateLoading sync.Mutex
)

func k8sStateCached(duration time.Duration) k8sState {
	stateLoading.Lock()
	if duration < time.Since(state.Timestamp) {
		logger.Println("Refreshing k8s state, due to being outdated")
		state = loadK8sState()
	}
	stateLoading.Unlock()

	return state
}

func connect() *kubernetes.Clientset {
	config, err := rest.InClusterConfig()
	if err != nil {
		panic(err.Error())
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}

	return clientset
}

func loadK8sState() k8sState {
	pods, err := clientset.CoreV1().Pods("").List(metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}

	services, err := clientset.CoreV1().Services("").List(metav1.ListOptions{})
	if err != nil {
		panic(err.Error())
	}

	ingresses, err := clientset.NetworkingV1beta1().Ingresses("").List(v1.ListOptions{})
	// Fallback to old ingress definitions
	ingressesExtensions, errExtensions := clientset.ExtensionsV1beta1().Ingresses("").List(v1.ListOptions{})
	if err != nil && errExtensions != nil {
		panic(err.Error())
	}

	return k8sState{
		Ingresses:           ingresses.Items,
		IngressesExtensions: ingressesExtensions.Items,
		Pods:                pods.Items,
		Services:            services.Items,
		Timestamp:           time.Now(),
	}
}
