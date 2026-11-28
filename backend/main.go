package main

import (
	"bufio"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/pprof"
	"os"
	"syscall"
	"time"
)

func main() {
	socket := os.Getenv("SOL_CALC_SOCKET")
	if socket == "" {
		log.Fatal("missing private socket path")
	}
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		conn, err := net.DialTimeout("unix", socket, time.Second)
		if err != nil {
			log.Fatal(err)
		}
		defer conn.Close()
		conn.SetDeadline(time.Now().Add(time.Second))
		io.WriteString(conn, "GET /health HTTP/1.0\r\n\r\n")
		res, err := http.ReadResponse(bufio.NewReader(conn), nil)
		if err != nil || res.StatusCode != 204 {
			os.Exit(1)
		}
		return
	}
	// A killed container may leave its socket inode in the persistent volume.
	if info, err := os.Lstat(socket); err == nil && info.Mode()&os.ModeSocket != 0 {
		conn, dialErr := net.DialTimeout("unix", socket, time.Second)
		if dialErr == nil {
			conn.Close()
			log.Fatal("calculator already running")
		}
		if errors.Is(dialErr, syscall.ECONNREFUSED) {
			if err = os.Remove(socket); err != nil {
				log.Fatal(err)
			}
		}
	}
	listener, err := net.Listen("unix", socket)
	if err != nil {
		log.Fatal(err)
	}
	// The gateway owns stdin. An interrupted gateway must also release its worker.
	if os.Getenv("SOL_CALC_CHILD") == "1" {
		go func() { _, _ = io.Copy(io.Discard, os.Stdin); listener.Close() }()
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) })
	mux.HandleFunc("POST /solar", shareCalculation(solar))
	mux.HandleFunc("POST /shade", shareCalculation(shade))
	mux.HandleFunc("POST /seasonal", shareCalculation(seasonal))
	mux.HandleFunc("POST /energy", shareCalculation(energy))
	mux.HandleFunc("POST /annual", shareCalculation(annualEnergy))
	mux.HandleFunc("POST /recommend", shareCalculation(recommend))
	mux.HandleFunc("POST /sizing", shareCalculation(sizing))
	if os.Getenv("SOL_PPROF") == "1" {
		mux.HandleFunc("GET /debug/pprof/", pprof.Index)
		mux.HandleFunc("GET /debug/pprof/profile", pprof.Profile)
		mux.HandleFunc("GET /debug/pprof/trace", pprof.Trace)
	}
	server := http.Server{Handler: mux, ReadHeaderTimeout: 3 * time.Second, ReadTimeout: 10 * time.Second, IdleTimeout: 30 * time.Second}
	log.Fatal(server.Serve(listener))
}
