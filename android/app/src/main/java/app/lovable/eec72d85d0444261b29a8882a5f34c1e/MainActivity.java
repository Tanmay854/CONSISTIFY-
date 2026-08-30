package app.lovable.eec72d85d0444261b29a8882a5f34c1e;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ask the display for its highest refresh rate (90/120Hz phones otherwise
        // often keep the window at 60Hz for WebView content).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Display display = getWindowManager().getDefaultDisplay();
                Display.Mode current = display.getMode();
                Display.Mode best = current;
                for (Display.Mode mode : display.getSupportedModes()) {
                    if (mode.getPhysicalWidth() == current.getPhysicalWidth()
                            && mode.getPhysicalHeight() == current.getPhysicalHeight()
                            && mode.getRefreshRate() > best.getRefreshRate()) {
                        best = mode;
                    }
                }
                WindowManager.LayoutParams params = getWindow().getAttributes();
                params.preferredDisplayModeId = best.getModeId();
                getWindow().setAttributes(params);
            } catch (Exception ignored) {
            }
        }

        // Remove the WebView overscroll glow: it forces extra invalidations while
        // flinging and makes scrolling feel sticky.
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
            }
        } catch (Exception ignored) {
        }
    }
}
