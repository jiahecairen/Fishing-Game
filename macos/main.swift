// 小猫钓鱼 · macOS 外壳
// 用 WKWebView 承载 web/ 目录里的游戏，并把存档保存到
// ~/Library/Application Support/CatFishing/save.json
import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!

    lazy var saveURL: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("CatFishing", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("save.json")
    }()

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()

        let controller = WKUserContentController()
        controller.add(self, name: "save")
        var boot = "window.__NATIVE__ = true;"
        if let data = try? Data(contentsOf: saveURL) {
            boot += "window.__NATIVE_SAVE_B64__ = \"\(data.base64EncodedString())\";"
        }
        controller.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let config = WKWebViewConfiguration()
        config.userContentController = controller
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 800),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "小猫钓鱼"
        window.minSize = NSSize(width: 960, height: 620)
        window.contentView = webView
        window.backgroundColor = NSColor(calibratedRed: 0.04, green: 0.06, blue: 0.12, alpha: 1)
        window.center()
        window.setFrameAutosaveName("CatFishingMainWindow")
        window.makeKeyAndOrderFront(nil)

        if let webDir = Bundle.main.resourceURL?.appendingPathComponent("web") {
            let index = webDir.appendingPathComponent("index.html")
            webView.loadFileURL(index, allowingReadAccessTo: webDir)
        }
        NSApp.activate(ignoringOtherApps: true)
    }

    // JS -> 原生：写入存档
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "save", let json = message.body as? String else { return }
        try? json.data(using: .utf8)?.write(to: saveURL, options: .atomic)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ notification: Notification) {
        // 退出前再存一次（同步等待一小会儿）
        var done = false
        webView?.evaluateJavaScript("window.__game && window.__game.save()") { _, _ in done = true }
        let until = Date().addingTimeInterval(0.5)
        while !done && Date() < until { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.02)) }
    }

    private func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem()
        main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于 小猫钓鱼", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "隐藏 小猫钓鱼", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "退出 小猫钓鱼", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let winItem = NSMenuItem()
        main.addItem(winItem)
        let winMenu = NSMenu(title: "窗口")
        winMenu.addItem(withTitle: "最小化", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        winMenu.addItem(withTitle: "关闭窗口", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winMenu.addItem(withTitle: "全屏", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        winItem.submenu = winMenu
        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
