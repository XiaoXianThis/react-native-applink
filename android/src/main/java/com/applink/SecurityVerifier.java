package com.applink;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Binder;
import android.os.Build;

import java.security.MessageDigest;
import java.util.Arrays;

/**
 * Verifies that the calling app shares the same signing certificate.
 * Only apps signed with the same key can communicate — this provides
 * security without requiring custom permissions or shared user IDs.
 */
public class SecurityVerifier {

    private final Context context;
    private final byte[] ownSignatureHash;

    public SecurityVerifier(Context context) {
        this.context = context;
        this.ownSignatureHash = getSignatureHash(context.getPackageName());
    }

    /** Check the signature of the current Binder caller against our own. */
    public boolean verifyCallerSignature() {
        int callingUid = Binder.getCallingUid();
        if (callingUid == android.os.Process.myUid()) {
            return true;
        }
        String[] packages = context.getPackageManager().getPackagesForUid(callingUid);
        if (packages == null || packages.length == 0) {
            return false;
        }
        byte[] callerHash = getSignatureHash(packages[0]);
        return callerHash != null && Arrays.equals(ownSignatureHash, callerHash);
    }

    /** Verify that an arbitrary package shares our signing certificate. */
    public boolean verifyPackageSignature(String packageName) {
        byte[] targetHash = getSignatureHash(packageName);
        return targetHash != null && Arrays.equals(ownSignatureHash, targetHash);
    }

    /** Return the package name of the current Binder caller. */
    public String getCallerPackageName() {
        int callingUid = Binder.getCallingUid();
        String[] packages = context.getPackageManager().getPackagesForUid(callingUid);
        return (packages != null && packages.length > 0) ? packages[0] : null;
    }

    @SuppressWarnings("deprecation")
    private byte[] getSignatureHash(String packageName) {
        try {
            PackageManager pm = context.getPackageManager();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo info = pm.getPackageInfo(
                        packageName, PackageManager.GET_SIGNING_CERTIFICATES);
                SigningInfo si = info.signingInfo;
                if (si == null) return null;
                Signature[] sigs = si.getApkContentsSigners();
                if (sigs != null && sigs.length > 0) {
                    return sha256(sigs[0].toByteArray());
                }
            } else {
                PackageInfo info = pm.getPackageInfo(
                        packageName, PackageManager.GET_SIGNATURES);
                Signature[] sigs = info.signatures;
                if (sigs != null && sigs.length > 0) {
                    return sha256(sigs[0].toByteArray());
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static byte[] sha256(byte[] data) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(data);
        } catch (Exception e) {
            return null;
        }
    }
}
