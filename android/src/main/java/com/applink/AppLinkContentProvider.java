package com.applink;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;

/**
 * Exposes this app's registered capabilities for cross-app discovery.
 *
 * Other apps query this provider via:
 *   content://{packageName}.applink
 *
 * Returns a cursor with columns [type, key]:
 *   - type = "state"  → a shared state key
 *   - type = "method" → a callable method name
 *
 * Because ContentProvider is instantiated by the system even when the
 * app is not running, discovery works without launching the Activity.
 * The data comes from SharedPreferences that were populated when the
 * app last ran and JS registered states/methods.
 */
public class AppLinkContentProvider extends ContentProvider {

    private static final String[] COLUMNS = {"type", "key"};

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection,
                        String[] selectionArgs, String sortOrder) {
        MatrixCursor cursor = new MatrixCursor(COLUMNS);

        SharedPreferences stateReg = getContext()
                .getSharedPreferences("applink_state_registry", 0);
        for (String key : stateReg.getAll().keySet()) {
            cursor.addRow(new Object[]{"state", key});
        }

        SharedPreferences methodReg = getContext()
                .getSharedPreferences("applink_method_registry", 0);
        for (String key : methodReg.getAll().keySet()) {
            cursor.addRow(new Object[]{"method", key});
        }

        return cursor;
    }

    @Override
    public String getType(Uri uri) {
        return "vnd.android.cursor.dir/applink.capabilities";
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values,
                      String selection, String[] selectionArgs) {
        return 0;
    }
}
