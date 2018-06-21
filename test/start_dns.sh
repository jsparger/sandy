#!/bin/bash
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf; sudo python dnsproxy.py --no-cache -s 8.8.8.8 -f ./hosts
nameserver 127.0.0.1
