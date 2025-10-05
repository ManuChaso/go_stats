package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type Stats struct {
	CPU    []float64 `json:"cpu"`
	Memory *mem.VirtualMemoryStat `json:"memory"`
	Disk []disk.UsageStat `json:"disk"`
	Net []net.IOCountersStat `json:"net"`
	Temp []host.TemperatureStat `json:"temp"`
}

var upgrade = websocket.Upgrader{}

func collectStats() *Stats {
	cpuPerc, _ := cpu.Percent(0, false)
	memStat, _ := mem.VirtualMemory()

	partitions, _ := disk.Partitions(false)
	var disks []disk.UsageStat
	for _, p := range partitions {
		if d, err := disk.Usage(p.Mountpoint); err == nil {
			disks = append(disks, *d)
		}
	}

	netStat, _ := net.IOCounters(false)
	temps, _ := host.SensorsTemperatures()

	return &Stats{CPU: cpuPerc, Memory: memStat, Disk: disks, Net: netStat, Temp: temps}
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrade.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
	}

	defer conn.Close()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		stats := collectStats()
		if err := conn.WriteJSON(stats); err != nil {
			log.Println("Write error:", err)
			break
		}
	}
}

func main() {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", wsHandler)

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}