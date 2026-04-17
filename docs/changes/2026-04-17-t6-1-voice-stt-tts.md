# T6.1 语音对话 (STT/TTS)

**日期**: 2026-04-17

**背景**: 为赛博酒馆添加语音输入 (Speech-to-Text) 和语音合成 (Text-to-Speech) 支持。

## 变更

### 后端 (fablemap/)

- **tavern.py**
  - 新增 `VoiceConfig` 数据类：enabled, tts_provider, tts_voice, tts_model, tts_speed, tts_language, stt_provider, stt_model, auto_play
  - 挂载到 `Tavern` 级别：`voice_config: VoiceConfig`
  - 新增 `save_voice_config()`, `get_voice_config()` 存储方法

- **web/service.py**
  - `save_voice_config_payload()`: 保存酒馆语音配置
  - `get_voice_config_payload()`: 获取酒馆语音配置
  - `synthesize_voice_payload()`: 使用酒馆 TTS 配置合成语音

- **web/router.py**
  - `GET /api/taverns/{tavern_id}/voice`: 获取语音配置
  - `PUT /api/taverns/{tavern_id}/voice`: 保存语音配置
  - `POST /api/taverns/{tavern_id}/tts`: 合成语音，返回音频文件

### 前端 (frontend/src/)

- **tavernService.js**
  - `getVoiceConfig(tavernId)`: 获取语音配置
  - `saveVoiceConfig(tavernId, config)`: 保存语音配置
  - `synthesizeVoice(tavernId, text)`: 合成语音，返回 blob URL
  - `listTtsProviders()`: 获取可用 TTS 提供商列表
  - `listTtsVoices(provider, apiKey)`: 获取提供商可用语音列表

- **TavernChatRoom.jsx**
  - `ChatInputArea`: 增加语音输入按钮，使用 Web Speech API (Chrome 原生)
  - `ChatMessage`: AI 回复增加 🔊 播放按钮，点击调用 TTS
  - 新增状态: `voiceConfig`, `handlePlayTTS()`
  - 新增 effects: 加载语音配置

- **TavernOwnerPanel.jsx**
  - `VoiceConfig Section`: 店主设置界面
    - 启用/禁用语音开关
    - TTS 提供商下拉 (ElevenLabs, OpenAI TTS, Edge TTS, Silero)
    - 语速滑块 (0.5x - 2.0x)
    - 🔊 测试语音按钮
    - 保存配置按钮

- **styles.css**
  - `.btn-voice-input`: 语音输入按钮样式
  - `.btn-voice-input.recording`: 录音中状态，脉冲动画
  - `.btn-play-tts`: 消息区 TTS 播放按钮

### 验证

```bash
# Python 编译检查
python -m compileall -q fablemap

# 前端构建 (需在 Windows 终端执行)
cd frontend && npm run build
```

## 已知限制

- **STT**: 仅支持 Chrome 浏览器 (Web Speech API)
- **TTS**: 需要酒馆已配置 LLM (使用相同 api_key)
- **语音文件**: 临时文件，需要前端及时消费 (createObjectURL)

## 未来工作

- 后端 Whisper/FasterWhisper STT 接入
- 语音角色切换 (不同 voice)
- STT 实时转写 (WebSocket)
- 语音消息存储与回放