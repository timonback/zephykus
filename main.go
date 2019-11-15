package main

import (
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	v1beta1 "k8s.io/api/networking/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type k8sState struct {
	Ingresses []v1beta1.Ingress `json:"ingresses"`
	Pods      []corev1.Pod      `json:"pods"`
	Services  []corev1.Service  `json:"services"`
}

func main() {
	clusterIngresses := make(chan k8sState, 1)

	go server(clusterIngresses)

	config, err := rest.InClusterConfig()
	if err != nil {
		panic(err.Error())
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}
	for {
		pods, err := clientset.CoreV1().Pods("").List(metav1.ListOptions{})
		if err != nil {
			panic(err.Error())
		}

		services, err := clientset.CoreV1().Services("").List(metav1.ListOptions{})
		if err != nil {
			panic(err.Error())
		}

		ingresses, err := clientset.NetworkingV1beta1().Ingresses("").List(v1.ListOptions{})
		if err != nil {
			panic(err.Error())
		}

		state := k8sState{Ingresses: ingresses.Items, Pods: pods.Items, Services: services.Items}
		clusterIngresses <- state

		fmt.Printf("%+v\n", state)
		time.Sleep(15 * time.Second)
	}
}
