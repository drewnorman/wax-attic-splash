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

The project requires Node.js 24.16 or newer within the Node 24 release line. The
Nix flake provides Node, Yarn, Firebase CLI, Google Cloud CLI, and OpenTofu.

For Podman-based development:

```sh
just local-up
```

The Compose service uses `docker.io/library/node:24-bookworm-slim`, runs the
Astro binary from the bind-mounted workspace, joins the external `local-proxy`
Podman network, and exposes Astro through the shared Traefik service at
`http://site.wax-attic-splash.localhost/`. The shared proxy must already be
running and listening on local port 80. Run `yarn install` on the host before
starting the container so `node_modules/.bin/astro` exists.

The Compose labels explicitly route `site.wax-attic-splash.localhost` through
Traefik's `web` entrypoint to Astro on port `4321`. Use `just local-logs` to
follow the service output and `just local-down` to stop and remove the stack.

The container sets `LOCAL_DEV_HTTP=1` and
`PUBLIC_SITE_URL=http://site.wax-attic-splash.localhost` so Astro and Vite
stay on plain HTTP locally.

## Scripts

- `yarn dev` starts Astro locally.
- `yarn build` runs Astro's strict TypeScript checks and writes the static site
  to `dist/`.
- `yarn lint` checks TypeScript, Astro components, CSS, and formatting.
- `yarn format` formats supported source and configuration files and fixes CSS
  lint issues where possible.
- `yarn test` runs the complete lint and production-build gate.
- `yarn preview` serves the built site locally.
- `yarn podman:dev` starts the Podman Compose local dev service.
- `yarn firebase:preview` deploys a temporary channel on the staging Hosting site.
- `yarn firebase:deploy` deploys the production Hosting site.

## Commit messages

Commit messages and pull request titles must follow the Conventional Commits
format:

```text
<type>(optional-scope): description
```

Common types include `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, and `revert`. For example:

```text
feat: add shop navigation
fix(infra): correct Firebase CNAME output
```

`yarn install` configures a Git `commit-msg` hook that checks messages locally.
GitHub Actions also checks every pull request commit and title, and the
`commitlint` check is required before merging to `master`.

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
- `Firebase Staging` deploys the staging site's live channel when an `-rc`
  release tag is pushed, such as `v0.1.1-rc1`.
- `Firebase Production` deploys live Firebase Hosting when a non-`-rc` release
  tag is pushed, such as `v0.1.1`.

Configure these GitHub Actions secrets:

- `RELEASE_PLEASE_TOKEN`
- `WIF_PROVIDER`
- `GCP_SA_EMAIL`

## Infrastructure

OpenTofu/Terraform configuration lives under `terraform/`:

- `terraform/shared` enables Firebase APIs, configures budget guardrails, and creates the GitHub Actions Workload Identity Federation deploy identity.
- `terraform/environments/staging` creates the staging Firebase Hosting site and outputs the optional CNAME target for external DNS.
- `terraform/environments/production` creates the production Firebase Hosting site and outputs manual DNS records for `shop.waxattic.com`.

Copy the relevant `terraform.tfvars.example` files before applying.

This repository does not manage `waxattic.com` DNS because that zone is owned
outside this project. Coordinate the `manual_dns_*` outputs with the DNS owner
when attaching `shop.waxattic.com` to Firebase Hosting. Attach
`www.shop.waxattic.com` as a permanent redirect to the canonical `shop`
hostname. Both custom-domain attachments remain manual until DNS control is
available to this stack or moved into a DNS-owning infrastructure repo. Do not
change the `waxattic.com` or `www.waxattic.com` Shopify records.

The shared stack also declares an empty authoritative `roles/editor` binding to
remove legacy default-service-account Editor grants. Apply only after reviewing
that the plan removes the expected broad grants and does not remove any required
human or workload principal.
