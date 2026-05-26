package top.gptcodex.imagestudio.android

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewFeature
import androidx.webkit.WebViewClientCompat

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var bridge: AndroidImageStudioBridge
    private lateinit var assetLoader: WebViewAssetLoader
    private val openImageLauncher = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (::bridge.isInitialized) bridge.onOpenImageDialogResult(uri)
    }
    private val importHistoryLauncher = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (::bridge.isInitialized) bridge.onImportHistoryResult(uri)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        
        // Apply edge-to-edge padding to the webview container if needed, 
        // but typically we want the web content to handle its own safe areas.
        // For now, we'll let it flow under the bars.
        ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insets ->
            insets
        }

        bridge = AndroidImageStudioBridge(
            this,
            webView,
            launchOpenImageDialog = {
                openImageLauncher.launch(arrayOf("image/*"))
            },
            launchImportHistory = {
                importHistoryLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
            },
        )
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            databaseEnabled = true
            
            // Performance optimizations
            setSupportZoom(false)
            displayZoomControls = false
            builtInZoomControls = false
        }
        
        // Hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // Keep the Android shell visually consistent with the app's own theme
        // tokens instead of letting WebView auto-darken individual form controls.
        when {
            WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING) -> {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(webView.settings, false)
            }
            WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK) -> {
                WebSettingsCompat.setForceDark(webView.settings, WebSettingsCompat.FORCE_DARK_OFF)
            }
        }
        
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(
                    "ImageStudioWebView",
                    "${consoleMessage.messageLevel()}: ${consoleMessage.message()} @ ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}",
                )
                return super.onConsoleMessage(consoleMessage)
            }
        }
        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
        }
        webView.addJavascriptInterface(bridge, "AndroidImageStudio")
        val launchNonce = System.currentTimeMillis()
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html?target=${BuildConfig.TARGET_PLATFORM}&rev=$launchNonce")
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        webView.post {
            webView.evaluateJavascript(
                """
                (() => {
                  window.dispatchEvent(new Event('resize'));
                  window.dispatchEvent(new Event('orientationchange'));
                  if (window.visualViewport) {
                    window.visualViewport.dispatchEvent(new Event('resize'));
                  }
                })();
                """.trimIndent(),
                null,
            )
        }
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("AndroidImageStudio")
        webView.destroy()
        super.onDestroy()
    }
}
