resource "google_firebase_hosting_site" "production" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.firebase_hosting_site_id
}

resource "google_firebase_hosting_custom_domain" "production_apex" {
  provider = google-beta

  project               = var.project_id
  site_id               = google_firebase_hosting_site.production.site_id
  custom_domain         = var.production_domain
  wait_dns_verification = false

  depends_on = [cloudflare_record.production_apex]
}

locals {
  firebase_hosting_reserved_ip = "199.36.158.100"
}

resource "cloudflare_record" "production_apex" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "A"
  content = local.firebase_hosting_reserved_ip
  proxied = false
}

resource "cloudflare_record" "production_firebase_ownership" {
  zone_id = var.cloudflare_zone_id
  name    = var.production_domain
  type    = "TXT"
  content = "hosting-site=${google_firebase_hosting_site.production.site_id}"
  ttl     = 120
  proxied = false
}
