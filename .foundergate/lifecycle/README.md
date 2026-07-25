# LRCQ V4 lifecycle root

FG-LRCQ-ACT-029. This directory is the SIGNED `lifecycle_root_realpath` of the V4 activation. Every
lifecycle record for a run — the ephemeral-key-signed consumed marker, the launch intent, and the
supervisor claim — is created here, exactly once, by the governed lifecycle authority
(`src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs`).

Nothing here confers authority on its own: a record with no valid per-activation ephemeral signature is
refused, a copied record cannot reconstruct the ephemeral private key (which never touches disk), and a
planted marker BLOCKS consumption rather than minting it.
