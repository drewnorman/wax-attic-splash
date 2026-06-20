output "project_number" {
  value = data.google_project.project.number
}

output "firebase_project_id" {
  value = google_firebase_project.default.project
}

output "workload_identity_provider" {
  description = "Set as the WIF_PROVIDER secret in GitHub Actions."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_sa_email" {
  description = "Set as the GCP_SA_EMAIL secret in GitHub Actions."
  value       = google_service_account.github_actions.email
}
