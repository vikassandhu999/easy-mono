package com.easy.client;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DurableStorage")
public class DurableStoragePlugin extends Plugin {
    private SharedPreferences preferences;

    @Override
    public void load() {
        preferences = getContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("A storage key and value are required.");
            return;
        }
        finish(call, preferences.edit().putString(key, value));
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("A storage key is required.");
            return;
        }
        finish(call, preferences.edit().remove(key));
    }

    private void finish(PluginCall call, SharedPreferences.Editor editor) {
        // Preferences.apply() acknowledges before disk persistence. Draft/session
        // writes must survive a process stop immediately after this promise resolves.
        if (editor.commit()) {
            call.resolve();
        } else {
            call.reject("The device could not save this change.");
        }
    }
}
