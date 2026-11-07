// 小猫钓鱼 · macOS 外壳
// 联网版：App 只是一个「窗口」，游戏页面和存档都在服务器上。
//   默认连接本机服务器 http://localhost:28787（双击「启动服务器.command」启动）
//   菜单「小猫钓鱼 → 服务器地址…」可以改成你部署在云上的服务器地址
// 旧版本（v0.4 及以前）的本地存档 ~/Library/Application Support/CatFishing/save.json
// 会在第一次登录时提示导入到账号里，导入后改名为 save.imported.json。
import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    let defaultServer = "http://localhost:28787"

    var serverURL: String {
        get {
            let s = UserDefaults.standard.string(forKey: "serverURL") ?? defaultServer
            return s == "http://localhost:8787" ? defaultServer : s   // 旧版默认端口 8787 容易和别的项目冲突，自动换成新端口
        }
        set { UserDefaults.standard.set(newValue, forKey: "serverURL") }
    }
    lazy var supportDir: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("CatFishing", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()
    var legacySaveURL: URL { supportDir.appendingPathComponent("save.json") }

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()

        let controller = WKUserContentController()
        controller.add(self, name: "legacy")
        controller.add(self, name: "native")
        var boot = "window.__NATIVE__ = true;"
        if let data = try? Data(contentsOf: legacySaveURL) {
            boot += "window.__NATIVE_SAVE_B64__ = \"\(data.base64EncodedString())\";"
        }
        controller.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let config = WKWebViewConfiguration()
        config.userContentController = controller
        config.websiteDataStore = .default()
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

        loadGame()
        NSApp.activate(ignoringOtherApps: true)
    }

    // 先问一声服务器「你是不是小猫钓鱼？」，确认之后再打开页面
    // （防止这个端口上跑的是你的其他项目，结果窗口里出现了别的网站）
    func loadGame() {
        var base = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        while base.hasSuffix("/") { base.removeLast() }
        guard let url = URL(string: base), let hello = URL(string: base + "/api/hello") else {
            showOffline(title: "服务器地址格式不对", reason: serverURL); return
        }
        let req = URLRequest(url: hello, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 4)
        URLSession.shared.dataTask(with: req) { data, _, error in
            DispatchQueue.main.async {
                if let error = error { self.showOffline(title: "连不上游戏服务器", reason: error.localizedDescription); return }
                guard let data = data,
                      let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      (obj["name"] as? String) == "小猫钓鱼" else {
                    self.showOffline(title: "这个地址上不是小猫钓鱼服务器", reason: "这个端口可能被你的其他项目占用了", wrong: true); return
                }
                self.webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8))
            }
        }.resume()
    }

    // 打不开游戏时显示的页面
    func showOffline(title: String, reason: String, wrong: Bool = false) {
        let tip = wrong
            ? "当前地址上运行的是别的程序。请确认已经双击 <code>启动服务器.command</code>（小猫钓鱼默认用 \(defaultServer)），<br>或者在菜单「小猫钓鱼 → 服务器地址…」里改成正确的地址。"
            : "请先启动服务器：双击游戏文件夹里的 <code>启动服务器.command</code>，<br>看到「服务器已启动」之后点重试。<br>如果服务器在别的电脑或云上，在菜单「小猫钓鱼 → 服务器地址…」里修改地址。"
        let html = """
        <!doctype html><html><head><meta charset="utf-8"><style>
        body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b1020;color:#f4efe6;font-family:-apple-system,"PingFang SC",sans-serif}
        .box{width:460px;background:#17131f;border:4px solid #fff;box-shadow:0 0 0 4px #000;padding:26px;text-align:center}
        h1{font-size:22px;color:#ffe36e;margin:6px 0 14px} p{font-size:13.5px;line-height:1.8;color:#c9c0d6}
        code{background:#000;padding:2px 6px} button{margin-top:14px;width:100%;padding:10px;font-size:16px;background:#ffb547;border:3px solid #000;cursor:pointer}
        small{display:block;margin-top:12px;color:#6f667c}
        </style></head><body><div class="box"><div style="font-size:56px">😿</div><h1>\(title)</h1>
        <p>\(tip)</p>
        <button onclick="webkit.messageHandlers.native.postMessage('retry')">↻ 重试</button>
        <small>当前地址：\(serverURL)<br>\(reason)</small></div></body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return } // 被新的载入打断，不算失败
        showOffline(title: "连不上游戏服务器", reason: error.localizedDescription)
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code == NSURLErrorCancelled { return }
        showOffline(title: "连不上游戏服务器", reason: error.localizedDescription)
    }

    // JS -> 原生
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "legacy" {
            // 旧存档已经导入到账号里：改个名字，下次就不再提示
            let done = supportDir.appendingPathComponent("save.imported.json")
            try? FileManager.default.removeItem(at: done)
            try? FileManager.default.moveItem(at: legacySaveURL, to: done)
        } else if message.name == "native", let cmd = message.body as? String, cmd == "retry" {
            loadGame()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    // 退出前把最新存档同步传到服务器
    func applicationWillTerminate(_ notification: Notification) {
        var payload: String? = nil
        var done = false
        webView?.evaluateJavaScript("window.__cfFlushSync ? window.__cfFlushSync() : ''") { result, _ in
            payload = result as? String; done = true
        }
        let until = Date().addingTimeInterval(1.0)
        while !done && Date() < until { RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.02)) }
        guard let p = payload, !p.isEmpty,
              let obj = try? JSONSerialization.jsonObject(with: Data(p.utf8)) as? [String: Any],
              let urlStr = obj["url"] as? String, let url = URL(string: urlStr),
              let token = obj["token"] as? String, let body = obj["body"] as? String else { return }
        var req = URLRequest(url: url, timeoutInterval: 3)
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = Data(body.utf8)
        let sem = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { _, _, _ in sem.signal() }.resume()
        _ = sem.wait(timeout: .now() + 3)
    }

    // ---------- 菜单 ----------
    @objc func askServer(_ sender: Any?) {
        let alert = NSAlert()
        alert.messageText = "服务器地址"
        alert.informativeText = "游戏会连接这个服务器（本机默认是 \(defaultServer)）。"
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 320, height: 24))
        field.stringValue = serverURL
        alert.accessoryView = field
        alert.addButton(withTitle: "连接")
        alert.addButton(withTitle: "取消")
        alert.addButton(withTitle: "恢复默认")
        let r = alert.runModal()
        if r == .alertFirstButtonReturn {
            var s = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !s.isEmpty && !s.contains("://") { s = "http://" + s }
            if !s.isEmpty { serverURL = s; loadGame() }
        } else if r == .alertThirdButtonReturn {
            serverURL = defaultServer; loadGame()
        }
    }
    @objc func reloadGame(_ sender: Any?) { loadGame() }
    @objc func openInBrowser(_ sender: Any?) { if let u = URL(string: serverURL) { NSWorkspace.shared.open(u) } }

    private func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem()
        main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于 小猫钓鱼", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        let server = NSMenuItem(title: "服务器地址…", action: #selector(askServer(_:)), keyEquivalent: ",")
        server.target = self
        appMenu.addItem(server)
        let reload = NSMenuItem(title: "重新载入", action: #selector(reloadGame(_:)), keyEquivalent: "r")
        reload.target = self
        appMenu.addItem(reload)
        let browser = NSMenuItem(title: "在浏览器中打开", action: #selector(openInBrowser(_:)), keyEquivalent: "")
        browser.target = self
        appMenu.addItem(browser)
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "隐藏 小猫钓鱼", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "退出 小猫钓鱼", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        // 编辑菜单：让登录框里可以用 ⌘C / ⌘V
        let editItem = NSMenuItem()
        main.addItem(editItem)
        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "复制", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu

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
