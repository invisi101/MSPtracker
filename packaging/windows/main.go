// MSP Tracker launcher for Windows: "MSP Tracker\MSP Tracker.exe".
//
// Starts the app's server with the bundled Node (nothing is installed on the PC), opens it in its
// own Edge app window, and waits. The server stops itself a few seconds after the window closes
// (see src/lib/server/lifetime.js); the launcher then closes the Edge instance it started.
// Everything the app stores goes in the Data folder next to the launcher, including the window's
// browser profile, so deleting the MSP Tracker folder removes every trace.
package main

import (
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

const port = "7797"
const url = "http://localhost:" + port

func alert(msg string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	box := user32.NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString("MSP Tracker")
	m, _ := syscall.UTF16PtrFromString(msg)
	box.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x30) // MB_ICONWARNING
}

// healthy reports whether MSP Tracker itself is answering on the port (not some other program).
func healthy() bool {
	c := http.Client{Timeout: time.Second}
	r, err := c.Get(url + "/health")
	if err != nil {
		return false
	}
	defer r.Body.Close()
	b, _ := io.ReadAll(r.Body)
	return r.StatusCode == 200 && strings.Contains(string(b), `"app":"msp-tracker"`)
}

func portTaken() bool {
	c := http.Client{Timeout: time.Second}
	r, err := c.Get(url)
	if err != nil {
		return false
	}
	r.Body.Close()
	return true
}

// hidden runs a program with no console window.
func hidden(cmd *exec.Cmd) *exec.Cmd {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // CREATE_NO_WINDOW
	return cmd
}

func edge() string {
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LocalAppData"} {
		p := filepath.Join(os.Getenv(env), "Microsoft", "Edge", "Application", "msedge.exe")
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

func main() {
	exe, err := os.Executable()
	if err != nil {
		alert("MSP Tracker couldn't work out where it is.")
		return
	}
	root := filepath.Dir(exe)
	app := filepath.Join(root, "app")
	data := filepath.Join(root, "Data")
	// Opening the launcher straight from inside the zip runs it from a temporary folder without the rest
	// of the app beside it.
	if _, err := os.Stat(filepath.Join(app, "runtime", "node.exe")); err != nil {
		alert("MSP Tracker needs to be unzipped first.\n\nRight-click the zip file, choose Extract All, then open MSP Tracker from the folder that appears.")
		return
	}
	if err := os.MkdirAll(data, 0o755); err != nil {
		alert("MSP Tracker can't create its Data folder in " + root + ". Move the MSP Tracker folder somewhere you can save files, like Documents.")
		return
	}

	var server *exec.Cmd
	if !healthy() {
		if portTaken() {
			alert("Something else on this PC is already using port " + port + ", so MSP Tracker can't start.")
			return
		}
		logf, _ := os.OpenFile(filepath.Join(data, "msp-tracker.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
		server = hidden(exec.Command(filepath.Join(app, "runtime", "node.exe"), filepath.Join(app, "build")))
		server.Env = append(os.Environ(),
			"MSP_DESKTOP=1", "NODE_ENV=production", "PORT="+port, "HOST=127.0.0.1", "ORIGIN="+url,
			"DATA_DIR="+data, "BODY_SIZE_LIMIT=20M",
			"MSP_SQLITE_BINDING="+filepath.Join(app, "runtime", "better_sqlite3.node"))
		if logf != nil {
			server.Stdout, server.Stderr = logf, logf
		}
		if err := server.Start(); err != nil {
			alert("MSP Tracker didn't start: " + err.Error())
			return
		}
		for i := 0; i < 80 && !healthy(); i++ {
			time.Sleep(250 * time.Millisecond)
		}
		if !healthy() {
			server.Process.Kill()
			alert("MSP Tracker didn't start. The details are in Data\\msp-tracker.log.")
			return
		}
	}

	// Its own window: Edge (on every Windows PC) in app mode, with its own profile inside Data.
	var window *exec.Cmd
	if e := edge(); e != "" {
		window = exec.Command(e, "--user-data-dir="+filepath.Join(data, "Browser"), "--app="+url,
			"--no-first-run", "--no-default-browser-check")
		if window.Start() != nil {
			window = nil
		}
	}
	if window == nil {
		hidden(exec.Command("rundll32", "url.dll,FileProtocolHandler", url)).Start()
	}

	// Only the launcher that started the server waits for it, then closes its Edge instance in case
	// Edge kept running in the background after the window closed.
	if server != nil {
		server.Wait()
		if window != nil && window.Process != nil {
			window.Process.Kill()
		}
	}
}
