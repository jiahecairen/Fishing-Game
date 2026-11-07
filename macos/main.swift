// 小猫钓鱼 · macOS 外壳
// 联网版：App 只是一个「窗口」，游戏页面和存档都在服务器上。
//   默认连接本机服务器 http://localhost:28787（双击「启动服务器.command」启动）
//   菜单「小猫钓鱼 → 服务器地址…」可以改成你部署在云上的服务器地址
// 旧版本（v0.4 及以前）的本地存档 ~/Library/Application Support/CatFishing/save.json
// 会在第一次登录时提示导入到账号里，导入后改名为 save.imported.json。
// 桌面宠物：网页发来 {cmd:'pet', on:true, w, h, hit} 时，把窗口变成透明、无边框、置顶的小浮窗；
//   只有小猫和小船能点到（其余地方点穿到桌面），左键拖动，右键菜单「还原窗口」。
import Cocoa
import WebKit

// 宠物模式时盖在网页上面的一层透明视图：接住鼠标——左键拖动窗口，右键（或 control+点击）弹出菜单
final class PetOverlay: NSView {
    weak var owner: AppDelegate?
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    override func mouseDown(with event: NSEvent) {
        if event.modifierFlags.contains(.control) { showMenu(event); return }
        window?.performDrag(with: event)
    }
    override func rightMouseDown(with event: NSEvent) { showMenu(event) }
    override func menu(for event: NSEvent) -> NSMenu? { owner?.petMenu() }
    private func showMenu(_ event: NSEvent) {
        guard let menu = owner?.petMenu() else { return }
        NSMenu.popUpContextMenu(menu, with: event, for: self)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var container: NSView!
    let normalMinSize = NSSize(width: 960, height: 620)
    let normalBackground = NSColor(calibratedRed: 0.04, green: 0.06, blue: 0.12, alpha: 1)

    // 桌面宠物
    var petOn = false
    var petOverlay: PetOverlay?
    var petTimer: Timer?
    var petHit: [CGRect] = []
    var normalFrame = NSRect.zero
    var normalStyle: NSWindow.StyleMask = [.titled, .closable, .miniaturizable, .resizable]
    var petMenuItem: NSMenuItem?
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
        window.minSize = normalMinSize
        // 网页放在一个容器里：宠物模式时在它上面再盖一层 PetOverlay
        container = NSView()
        window.contentView = container
        webView.frame = container.bounds
        webView.autoresizingMask = [.width, .height]
        container.addSubview(webView)
        window.backgroundColor = normalBackground
        window.delegate = self
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
        } else if message.name == "native" {
            if let cmd = message.body as? String {
                if cmd == "retry" { loadGame() }
            } else if let d = message.body as? [String: Any], (d["cmd"] as? String) == "pet" {
                if (d["on"] as? Bool) == true {
                    let w = CGFloat((d["w"] as? Double) ?? 240), h = CGFloat((d["h"] as? Double) ?? 150)
                    var rects: [CGRect] = []
                    if let hit = d["hit"] as? [[Double]] {
                        for r in hit where r.count == 4 { rects.append(CGRect(x: r[0], y: r[1], width: r[2], height: r[3])) }
                    }
                    enterPet(size: NSSize(width: w, height: h), hit: rects)
                } else {
                    leavePet(notifyWeb: false)
                }
            }
        }
    }

    // ---------- 桌面宠物 ----------
    func enterPet(size: NSSize, hit: [CGRect]) {
        petHit = hit.isEmpty ? [CGRect(origin: .zero, size: size)] : hit
        if petOn { return }
        if window.styleMask.contains(.fullScreen) { // 先退出全屏，动画结束后再变成宠物
            window.toggleFullScreen(nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { self.enterPet(size: size, hit: hit) }
            return
        }
        petOn = true
        normalFrame = window.frame
        normalStyle = window.styleMask
        window.setFrameAutosaveName("")            // 别把小浮窗的位置记成主窗口的位置
        window.styleMask = [.borderless]
        window.minSize = NSSize(width: 40, height: 40)
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating                   // 浮在其他窗口上面
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        window.setFrame(NSRect(origin: petOrigin(for: size), size: size), display: true)

        let overlay = PetOverlay(frame: container.bounds)
        overlay.autoresizingMask = [.width, .height]
        overlay.owner = self
        container.addSubview(overlay)
        petOverlay = overlay

        // 鼠标不在小猫和小船上时，点击穿过浮窗落到桌面上
        let timer = Timer(timeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in self?.updateClickThrough() }
        RunLoop.main.add(timer, forMode: .common)
        petTimer = timer
        window.orderFrontRegardless()
        updatePetMenuItem()
    }

    func leavePet(notifyWeb: Bool) {
        if !petOn { return }
        petOn = false
        petTimer?.invalidate(); petTimer = nil
        petOverlay?.removeFromSuperview(); petOverlay = nil
        window.ignoresMouseEvents = false
        window.styleMask = normalStyle
        window.isOpaque = true
        window.backgroundColor = normalBackground
        window.hasShadow = true
        window.level = .normal
        window.collectionBehavior = []
        window.minSize = normalMinSize
        window.setFrame(normalFrame, display: true)
        window.setFrameAutosaveName("CatFishingMainWindow")
        window.title = "小猫钓鱼"
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        if notifyWeb { webView.evaluateJavaScript("window.Pet && Pet.leave(true)", completionHandler: nil) }
        updatePetMenuItem()
    }

    func updateClickThrough() {
        guard petOn, let w = window else { return }
        let m = NSEvent.mouseLocation, f = w.frame
        let p = CGPoint(x: m.x - f.minX, y: f.maxY - m.y)   // 换成「从左上角算」的坐标，和网页一致
        let inside = petHit.contains { $0.contains(p) }
        if w.ignoresMouseEvents == inside { w.ignoresMouseEvents = !inside }
    }

    // 浮窗放在哪：上次的位置（还在屏幕上的话），否则屏幕右下角
    func petOrigin(for size: NSSize) -> NSPoint {
        if let s = UserDefaults.standard.string(forKey: "petOrigin") {
            let p = NSPointFromString(s)
            if NSScreen.screens.contains(where: { $0.visibleFrame.intersects(NSRect(origin: p, size: size)) }) { return p }
        }
        let vf = (NSScreen.main ?? NSScreen.screens.first)?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1280, height: 800)
        return NSPoint(x: vf.maxX - size.width - 40, y: vf.minY + 40)
    }

    func windowDidMove(_ notification: Notification) {
        if petOn { UserDefaults.standard.set(NSStringFromPoint(window.frame.origin), forKey: "petOrigin") }
    }

    // 右键菜单
    func petMenu() -> NSMenu {
        let menu = NSMenu()
        let restore = NSMenuItem(title: "还原窗口", action: #selector(restoreFromPet(_:)), keyEquivalent: "")
        restore.target = self
        menu.addItem(restore)
        menu.addItem(.separator())
        let quit = NSMenuItem(title: "退出 小猫钓鱼", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "")
        quit.target = NSApp
        menu.addItem(quit)
        return menu
    }
    @objc func restoreFromPet(_ sender: Any?) { leavePet(notifyWeb: true) }
    @objc func togglePet(_ sender: Any?) {
        if petOn { leavePet(notifyWeb: true) }
        else { webView.evaluateJavaScript("window.Pet && Pet.enter()", completionHandler: nil) }
    }
    func updatePetMenuItem() { petMenuItem?.title = petOn ? "还原窗口" : "桌面宠物" }

    // 页面重新载入了（网页里的宠物状态没了）：先把窗口还原
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if petOn { leavePet(notifyWeb: false) }
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
        winMenu.addItem(.separator())
        let pet = NSMenuItem(title: "桌面宠物", action: #selector(togglePet(_:)), keyEquivalent: "p")
        pet.target = self
        winMenu.addItem(pet)
        petMenuItem = pet
        winItem.submenu = winMenu
        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
