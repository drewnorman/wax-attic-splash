<h1 align="center">Wax Attic Splash</h1>

<div align="center">
    A splash page introducing the Wax Attic shop.
</div>

## Development

This is a public-repo, static-first Astro site deployed with Firebase Hosting.
The package remains marked private only to prevent accidental npm publishing.

```sh
nix develop
yarn install
yarn dev
```

The Nix flake provides Node, Yarn, Firebase CLI, Google Cloud CLI, and OpenTofu.

## Scripts

- `yarn dev` starts Astro locally.
- `yarn build` runs `astro check` and writes the static site to `dist/`.
- `yarn preview` serves the built site locally.
- `yarn firebase:preview` deploys a temporary Firebase Hosting channel.
- `yarn firebase:deploy` deploys Firebase Hosting.

## Firebase Hosting

`firebase.json` points Hosting at `dist/`, enables clean URLs, and sets cache
headers for static assets and HTML.

GitHub Actions handles test and deploy automation:

- `CI` runs `yarn test` on pushes and pull requests.
- `Commitlint` enforces conventional commit messages on pull requests and
  pushes to `master`.
- `Firebase Preview` deploys a 7-day Firebase Hosting preview channel for pull
  requests opened from this repository.
- `Release Please` opens and maintains release PRs from conventional commits on
  `master`.
- `Firebase Staging` deploys the `staging` channel when an `-rc` release tag is
  pushed, such as `v0.1.1-rc1`.
- `Firebase Production` deploys live Firebase Hosting when a non-`-rc` release
  tag is pushed, such as `v0.1.1`.

Configure these GitHub Actions secrets:

- `RELEASE_PLEASE_TOKEN`
- `WIF_PROVIDER`
- `GCP_SA_EMAIL`

## Infrastructure

OpenTofu/Terraform configuration lives under `terraform/`:

- `terraform/shared` enables Firebase APIs, configures budget guardrails, and creates the GitHub Actions Workload Identity Federation deploy identity.
- `terraform/environments/staging` creates the staging Firebase Hosting site and a Cloudflare CNAME placeholder.
- `terraform/environments/production` creates the production Firebase Hosting site and Cloudflare records for `waxattic.com`.

Copy the relevant `terraform.tfvars.example` files before applying.

The shared stack also declares an empty authoritative `roles/editor` binding to
remove legacy default-service-account Editor grants. Apply only after reviewing
that the plan removes the expected broad grants and does not remove any required
human or workload principal.
