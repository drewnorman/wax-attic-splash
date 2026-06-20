resource "google_firebase_hosting_site" "staging" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.firebase_hosting_site_id
}

resource "cloudflare_record" "staging" {
  zone_id = var.cloudflare_zone_id
  name    = var.staging_dns_name
  type    = "CNAME"
  content = "${google_firebase_hosting_site.staging.site_id}.web.app"
  proxied = false
}
