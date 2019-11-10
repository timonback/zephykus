/*
Copyright 2016 The Kubernetes Authors.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Note: the example only works with the code within the same release/branch.
package main

import (
	"encoding/json"
	"fmt"
	"time"

	v1beta1 "k8s.io/api/networking/v1beta1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func main() {
	clusterIngresses := make(chan string, 2)

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
		fmt.Printf("There are %d pods in the cluster\n", len(pods.Items))

		var ingressRules []v1beta1.Ingress

		namespaces, err := clientset.CoreV1().Namespaces().List(metav1.ListOptions{})
		if err != nil {
			panic(err.Error())
		}
		for _, namespace := range namespaces.Items {
			namespaceName := namespace.Name
			ingresses, err := clientset.NetworkingV1beta1().Ingresses(namespaceName).List(v1.ListOptions{})
			if err != nil {
				panic(err.Error())
			}
			for _, ingress := range ingresses.Items {
				ingressRules = append(ingressRules, ingress)
			}
		}

		ingressJsonBytes, err := json.Marshal(ingressRules)
		ingressJson := string(ingressJsonBytes)
		clusterIngresses <- ingressJson
		fmt.Printf("%s\n", ingressJson)

		time.Sleep(10 * time.Second)
	}
}
