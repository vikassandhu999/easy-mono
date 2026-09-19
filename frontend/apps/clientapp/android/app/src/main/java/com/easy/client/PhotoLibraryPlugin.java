package com.easy.client;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PhotoLibrary")
public class PhotoLibraryPlugin extends Plugin {
    @PluginMethod
    public void pick(PluginCall call) {
        PickVisualMediaRequest request = new PickVisualMediaRequest.Builder()
            .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE)
            .build();
        Intent intent = new ActivityResultContracts.PickVisualMedia().createIntent(getContext(), request);
        try {
            // Capacitor saves this call with the activity so appRestoredResult can
            // deliver the selection after Android reclaims the background process.
            startActivityForResult(call, intent, "picked");
        } catch (ActivityNotFoundException error) {
            call.reject("The photo library could not be opened.", error);
        }
    }

    @ActivityCallback
    private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = new ActivityResultContracts.PickVisualMedia()
            .parseResult(result.getResultCode(), result.getData());
        if (uri == null) {
            call.reject("Photo selection cancelled.", "cancelled");
            return;
        }
        JSObject photo = new JSObject();
        photo.put("path", uri.toString());
        call.resolve(photo);
    }
}
