#!/usr/bin/env python3
"""分析 mitmproxy 抓包文件，提取 Claude API 请求和响应"""

from mitmproxy import io
from mitmproxy.http import HTTPFlow
import json

def analyze_capture(filename="mitm_capture.mitm"):
    with open(filename, "rb") as f:
        reader = io.FlowReader(f)

        for flow in reader.stream():
            if isinstance(flow, HTTPFlow):
                # 过滤 Claude API 请求
                url = flow.request.pretty_url
                if "rsxermu666.cn" in url and "/v1/" in url:
                    print("=" * 60)
                    print(f">> {flow.request.method} {url}")
                    print("=" * 60)

                    # 请求头
                    print("\n>> Request Headers:")
                    for k, v in flow.request.headers.items():
                        # 隐藏 API key 主体
                        if "key" in k.lower() and len(v) > 10:
                            v = v[:8] + "..." + v[-4:]
                        print(f"  {k}: {v}")

                    # 请求体
                    if flow.request.content:
                        try:
                            body = json.loads(flow.request.content)
                            print("\n>> Request Body:")
                            print(json.dumps(body, indent=2, ensure_ascii=False))
                        except:
                            print("\n>> Request Body (raw):")
                            print(flow.request.content.decode('utf-8', errors='replace'))

                    # 响应
                    if flow.response:
                        print("\n<< Response Status:", flow.response.status_code)
                        print("<< Response Headers:")
                        for k, v in flow.response.headers.items():
                            print(f"  {k}: {v}")

                        if flow.response.content:
                            try:
                                resp_body = json.loads(flow.response.content)
                                print("\n<< Response Body:")
                                print(json.dumps(resp_body, indent=2, ensure_ascii=False))
                            except:
                                print("\n<< Response Body (raw):")
                                print(flow.response.content.decode('utf-8', errors='replace'))
                    print("\n")

if __name__ == "__main__":
    analyze_capture()