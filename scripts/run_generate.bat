@echo off
echo ========================================
echo FableMap 地图资源生成脚本
echo ========================================
echo.

REM 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python
    pause
    exit /b 1
)

REM 检查依赖
echo [1/4] 检查依赖...
pip show replicate >nul 2>&1
if errorlevel 1 (
    echo 安装 replicate...
    pip install replicate requests
)

REM 检查 API Token
echo.
echo [2/4] 检查 API Token...
if "%REPLICATE_API_TOKEN%"=="" (
    echo.
    echo [重要] 请设置 REPLICATE_API_TOKEN 环境变量
    echo.
    echo 步骤：
    echo 1. 访问 https://replicate.com/account/api-tokens
    echo 2. 注册并获取免费 token
    echo 3. 运行: set REPLICATE_API_TOKEN=你的token
    echo 4. 重新运行此脚本
    echo.
    pause
    exit /b 1
)

REM 切换到项目目录
echo.
echo [3/4] 切换到项目目录...
cd /d d:\work\ai-

REM 运行生成脚本
echo.
echo [4/4] 开始生成资源（预计 30-45 分钟）...
echo.
python scripts/generate_map_assets.py

echo.
echo ========================================
echo 完成！
echo ========================================
pause
