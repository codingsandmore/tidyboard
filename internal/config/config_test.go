package config

import (
	"strings"
	"testing"
)

// Test the deployment-mode profile and its validation rules. The local profile
// must (1) be selectable via TIDYBOARD_DEPLOYMENT_MODE / yaml, (2) supply safe
// defaults that do not require any cloud service, and (3) reject cloud-only
// settings (Cognito, S3, Stripe, AI provider that requires hosted endpoints).
//
// Issue: https://github.com/codingsandmore/tidyboard/issues/75
// Spec:  docs/superpowers/specs/2026-04-30-local-production-mode-design.md

func TestDeploymentMode_Default(t *testing.T) {
	// Zero-valued config (no explicit mode) should be treated as cloud so the
	// existing EC2 / hosted production deploy keeps working unchanged.
	var cfg Config
	if got := cfg.DeploymentModeOrDefault(); got != DeploymentModeCloud {
		t.Fatalf("default deployment mode = %q, want %q", got, DeploymentModeCloud)
	}
}

func TestDeploymentMode_LocalIsRecognised(t *testing.T) {
	cfg := Config{Deployment: DeploymentConfig{Mode: "local"}}
	if got := cfg.DeploymentModeOrDefault(); got != DeploymentModeLocal {
		t.Fatalf("explicit local mode = %q, want %q", got, DeploymentModeLocal)
	}
}

func TestValidate_CloudModeUnchanged(t *testing.T) {
	// A representative cloud config — Cognito + S3 + Stripe — must keep working
	// (Acceptance criterion: existing cloud/EC2 production config still works).
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "cloud"},
		Auth: AuthConfig{
			Cognito: CognitoConfig{
				Region:     "us-east-1",
				UserPoolID: "us-east-1_abc",
				ClientID:   "client-id",
			},
		},
		Storage: StorageConfig{Type: "s3", S3Bucket: "tidyboard-prod"},
		Stripe:  StripeConfig{Enabled: true},
		Backup:  BackupConfig{S3Enabled: true, S3Bucket: "tidyboard-backups"},
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("cloud-mode validation should succeed, got %v", err)
	}
}

func TestValidate_LocalModeAllowsLocalDefaults(t *testing.T) {
	// Pure local profile — local storage, no Cognito, no S3, billing disabled,
	// AI disabled. Must pass.
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "local"},
		Storage:    StorageConfig{Type: "local", LocalPath: "./data/media"},
		Backup:     BackupConfig{Enabled: true, LocalPath: "./data/backups"},
		Stripe:     StripeConfig{Enabled: false},
		AI:         AIConfig{Enabled: false},
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("local-mode validation should succeed for safe defaults, got %v", err)
	}
}

func TestValidate_LocalRejectsCognito(t *testing.T) {
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "local"},
		Auth: AuthConfig{
			Cognito: CognitoConfig{
				Region:     "us-east-1",
				UserPoolID: "us-east-1_abc",
				ClientID:   "client-id",
			},
		},
		Storage: StorageConfig{Type: "local"},
	}
	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error when local mode is configured with a Cognito user pool")
	}
	if !strings.Contains(err.Error(), "cognito") {
		t.Fatalf("error should mention cognito, got: %v", err)
	}
}

func TestValidate_LocalRejectsS3Storage(t *testing.T) {
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "local"},
		Storage:    StorageConfig{Type: "s3", S3Bucket: "tidyboard"},
	}
	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error when local mode uses s3 storage")
	}
	if !strings.Contains(err.Error(), "storage") {
		t.Fatalf("error should mention storage, got: %v", err)
	}
}

func TestValidate_LocalRejectsS3Backup(t *testing.T) {
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "local"},
		Storage:    StorageConfig{Type: "local"},
		Backup:     BackupConfig{S3Enabled: true, S3Bucket: "tidyboard-backups"},
	}
	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error when local mode uses S3 backup target")
	}
	if !strings.Contains(err.Error(), "backup") {
		t.Fatalf("error should mention backup, got: %v", err)
	}
}

func TestValidate_LocalRejectsStripe(t *testing.T) {
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "local"},
		Storage:    StorageConfig{Type: "local"},
		Stripe:     StripeConfig{Enabled: true, SecretKey: "sk_test_x"},
	}
	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error when local mode enables stripe billing")
	}
	if !strings.Contains(err.Error(), "stripe") && !strings.Contains(err.Error(), "billing") {
		t.Fatalf("error should mention stripe/billing, got: %v", err)
	}
}

func TestValidate_LocalRejectsAWSProfileForStorage(t *testing.T) {
	// Local mode must not pull AWS credentials. AWSProfile on Storage is a
	// cloud-only setting; it has no meaning when storage.type=local, and is a
	// strong signal that the operator copied a cloud config without auditing
	// it. Fail fast.
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "local"},
		Storage:    StorageConfig{Type: "local", AWSProfile: "tidyboard-prod"},
	}
	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error when local mode has an AWS profile configured for storage")
	}
}

func TestValidate_UnknownModeIsRejected(t *testing.T) {
	cfg := Config{Deployment: DeploymentConfig{Mode: "kubernetes"}}
	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected error for unknown deployment mode")
	}
}

func TestValidate_LocalReportsAllProblemsAtOnce(t *testing.T) {
	// Operators should see every misconfiguration in one error so they don't
	// have to run, fix, run, fix. A combined-error message keeps the bring-up
	// loop short.
	cfg := Config{
		Deployment: DeploymentConfig{Mode: "local"},
		Auth: AuthConfig{Cognito: CognitoConfig{
			Region: "us-east-1", UserPoolID: "us-east-1_abc", ClientID: "x",
		}},
		Storage: StorageConfig{Type: "s3", S3Bucket: "x"},
		Stripe:  StripeConfig{Enabled: true},
	}
	err := cfg.Validate()
	if err == nil {
		t.Fatal("expected combined error from validate")
	}
	msg := err.Error()
	for _, want := range []string{"cognito", "storage", "stripe"} {
		if !strings.Contains(strings.ToLower(msg), want) {
			t.Errorf("combined error missing %q: %s", want, msg)
		}
	}
}
