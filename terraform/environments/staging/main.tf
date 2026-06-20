resource "google_firebase_hosting_site" "staging" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.firebase_hosting_site_id
}
