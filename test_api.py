import requests
import json
url = "http://localhost:8000/api/optimize"
payload = {"origin": "Avenida Dom Aguirre 3000 Sorocaba", "stops": ["Rua da Penha Sorocaba"]}
try:
    res = requests.post(url, json=payload)
    print(res.text)
except Exception as e:
    print(e)
