# ADR 0011: Terraform for Vercel Environment Variables

## Status

Accepted

## Context

We need to manage Vercel environment variables as code to:

- **Track changes**: Version control for environment configuration
- **Reproducibility**: Consistent environment setup across deployments
- **Collaboration**: Team members can review and understand configuration changes

Options considered:

| Option               | Pros                                       | Cons                                  |
| -------------------- | ------------------------------------------ | ------------------------------------- |
| Vercel CLI + scripts | Simple, no extra tooling                   | Manual, imperative approach           |
| Terraform            | Declarative, mature ecosystem, widely used | Requires state management             |
| Pulumi               | TypeScript support                         | Smaller community, less documentation |
| vercel.json          | Built-in, simple                           | Cannot manage secrets                 |

## Decision

Use **Terraform** with the official Vercel provider to manage environment variables.

### Reasons

1. **Team familiarity**: Developers already know Terraform
2. **Rich ecosystem**: Extensive documentation and community support
3. **Clean syntax**: Environment variables can be expressed as simple key-value pairs
4. **Declarative**: Define desired state, Terraform handles the rest

### Configuration Structure

```hcl
# terraform/main.tf
terraform {
  required_providers {
    vercel = {
      source = "vercel/vercel"
    }
  }
}

resource "vercel_project_environment_variable" "example" {
  project_id = var.vercel_project_id
  key        = "EXAMPLE_KEY"
  value      = "example_value"
  target     = ["production", "preview", "development"]
}
```

## Consequences

### Benefits

1. **Version controlled**: All environment changes are tracked in Git
2. **Review process**: Changes go through pull requests
3. **Consistency**: Same configuration across all environments
4. **Automation**: Can be integrated into CI/CD pipelines

### Drawbacks

1. **State management**: Terraform state must be stored securely
2. **Learning curve**: Team members unfamiliar with Terraform need onboarding
3. **Secret handling**: Sensitive values should not be committed; use environment variables or secret managers

### Security Considerations

- Store Terraform state in a secure backend (e.g., Terraform Cloud, S3 with encryption)
- Use environment variables or secret managers for sensitive values
- Never commit secrets to the repository

## Related

- Vercel Terraform Provider: https://registry.terraform.io/providers/vercel/vercel/latest/docs
- Terraform: https://www.terraform.io/
