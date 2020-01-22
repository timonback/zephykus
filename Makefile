# I usually keep a `VERSION` file in the root so that anyone
# can clearly check what's the VERSION of `master` or any
# branch at any time by checking the `VERSION` in that git
# revision.
#
# Another benefit is that we can pass this file to our Docker
# build context and have the version set in the binary that ends
# up inside the Docker image too.
DOCKER_CLI      :=      docker
VERSION         :=      $(shell cat ./VERSION)
ARCH            :=      linux
IMAGE_NAME      :=      timonback/zephykus


# As a call to `make` without any arguments leads to the execution
# of the first target found I really prefer to make sure that this
# first one is a non-destructive one that does the most simple
# desired installation.
#
# It's very common to people set it as `all` but it could be anything
# like `a`.
all: image


build-go:
	env GO111MODULE=on GOOS=$(ARCH) go build -v .
build-webpack:
	cd frontend && npm run build
build: build-go build-webpack

backend-dep:
	env GO111MODULE=on go mod download
backend-dep-update:
	env GO111MODULE=on go mod tidy
frontend-dep:
	cd frontend && npm install

test:
	go test ./... -v

fmt:
	go fmt ./... -v

image: build
	$(DOCKER_CLI) build -t $(IMAGE_NAME) .
	$(DOCKER_CLI) tag $(IMAGE_NAME) $(IMAGE_NAME):$(VERSION)
image-push: image
	$(DOCKER_CLI) push $(IMAGE_NAME):latest
	$(DOCKER_CLI) push $(IMAGE_NAME):$(VERSION)

deploy: image
	kubectl apply -f zephykus.yaml
deploy-force: deploy
	kubectl patch rs $$(kubectl get rs | awk '{print $$1}' | grep zephykus) -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"dummy-date\":\"`date`\"}}}}}"

undeploy:
	kubectl delete -f zephykus.yaml


# This is pretty much an optional thing that I tend always to include.
#
# Goreleaser is a tool that allows anyone to integrate a binary releasing
# process to their pipelines.
#
# Here in this target With just a simple `make release` you can have a
# `tag` created in GitHub with multiple builds if you wish.
#
# See more at `gorelease` github repo.
release:
	git tag -a $(VERSION) -m "Release" || true
	git push origin $(VERSION)
	goreleaser --rm-dist

.PHONY: test build fmt release
