set dotenv-load := true

default:
  just --list

fmt:
  tofu fmt -recursive terraform
  nix fmt

check:
  yarn test
  just tofu-fmt-check
  just nix-check

commitlint range="HEAD~1..HEAD":
  yarn commitlint --from {{range}}

tofu-fmt:
  tofu fmt -recursive terraform

tofu-fmt-check:
  tofu fmt -check -recursive terraform

tofu-validate stack:
  cd terraform/{{stack}} && tofu init -backend=false && tofu validate

tofu-validate-all:
  just tofu-validate shared
  just tofu-validate environments/staging
  just tofu-validate environments/production

firebase-preview:
  yarn firebase:preview

firebase-deploy:
  yarn firebase:deploy

nix-check:
  nix flake check path:$PWD
