package com.applink;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Persisted key-value store for shared states.
 *
 * States are stored in SharedPreferences so they survive process restarts
 * and can be read by the ContentProvider even when JS hasn't booted yet.
 *
 * A separate "registry" preference tracks which keys this app owns,
 * which is used by the ContentProvider for discovery responses.
 */
public class StateStore {

    private static final String PREF_STATES = "applink_states";
    private static final String PREF_REGISTRY = "applink_state_registry";

    private final SharedPreferences statePrefs;
    private final SharedPreferences registryPrefs;
    private final Map<String, Set<StateListener>> keyListeners = new ConcurrentHashMap<>();
    private volatile StateListener globalListener;

    public interface StateListener {
        void onStateChanged(String key, String value);
    }

    public StateStore(Context context) {
        this.statePrefs = context.getSharedPreferences(PREF_STATES, Context.MODE_PRIVATE);
        this.registryPrefs = context.getSharedPreferences(PREF_REGISTRY, Context.MODE_PRIVATE);
    }

    /** Register a key as owned by this app and set its default value if absent. */
    public void registerState(String key, String defaultValue) {
        registryPrefs.edit().putBoolean(key, true).apply();
        if (!statePrefs.contains(key)) {
            statePrefs.edit().putString(key, defaultValue).apply();
        }
    }

    public void unregisterState(String key) {
        registryPrefs.edit().remove(key).apply();
    }

    /** Keys currently registered (owned) by this app. */
    public Set<String> getRegisteredKeys() {
        return registryPrefs.getAll().keySet();
    }

    public String getState(String key) {
        return statePrefs.getString(key, null);
    }

    public void setState(String key, String value) {
        statePrefs.edit().putString(key, value).apply();
        notifyKeyListeners(key, value);
        StateListener gl = globalListener;
        if (gl != null) {
            gl.onStateChanged(key, value);
        }
    }

    /** Listener that fires for any key change — used by AppLinkModule to forward events to JS. */
    public void setGlobalListener(StateListener listener) {
        this.globalListener = listener;
    }

    public void addKeyListener(String key, StateListener listener) {
        keyListeners.computeIfAbsent(key, k -> new CopyOnWriteArraySet<>()).add(listener);
    }

    public void removeKeyListener(String key, StateListener listener) {
        Set<StateListener> set = keyListeners.get(key);
        if (set != null) {
            set.remove(listener);
            if (set.isEmpty()) keyListeners.remove(key);
        }
    }

    private void notifyKeyListeners(String key, String value) {
        Set<StateListener> set = keyListeners.get(key);
        if (set != null) {
            for (StateListener l : set) {
                l.onStateChanged(key, value);
            }
        }
    }
}
