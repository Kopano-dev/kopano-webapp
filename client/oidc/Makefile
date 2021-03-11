# Usage: 
#
# make update 
# make update TAG=2.1.1
#
TAG ?= latest

RELEASE_URL = $(shell curl -sq https://api.github.com/repos/IdentityModel/oidc-client-js/releases/$(TAG)|jq -r .tarball_url)
TAG_URL = $(shell curl -sq https://api.github.com/repos/IdentityModel/oidc-client-js/tags|jq '.[]|select(.name == "$(TAG)")|.tarball_url')
URL ?= $(if $(filter latest, $(TAG)), $(RELEASE_URL), $(TAG_URL))
VERSION = $(shell basename $(URL))

all:

.PHONY: update
update:
	echo $(VERSION)
	curl -L $(URL) | tar -C . --strip-components 2 --wildcards "*/dist/oidc-client.js*" --wildcards "*/dist/oidc-client.min.js*" -xzvf -
	@echo "# OIDC client library\n\nTaken from $(URL)" > README.md