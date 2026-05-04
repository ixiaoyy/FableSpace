
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'file:///D:/work/ai-/frontend/app/product/styles.css'
import CharacterEditor from 'file:///D:/work/ai-/frontend/app/product/CharacterEditor.jsx'

const initialCharacter = {
  name: '灯叔',
  description: '深夜便利店柜台旁的赛博酒馆店员。',
  personality: '慢热，短句，愿意解释规则。',
  scenario: '雨夜，门口有人误会了登记册规则。',
  system_prompt: '保持店主确认的边界。',
  first_mes: '伞放这边，别挡门。',
  mes_example: '<START>\n{{char}}: 我先看登记册。',
  tags: ['便利店', '深夜'],
}

function App() {
  const [saved, setSaved] = useState(null)
  return (
    <main className="app-shell">
      <div className="modal-content panel" style={{ maxWidth: 980, margin: '24px auto' }}>
        <CharacterEditor
          value={initialCharacter}
          onSave={setSaved}
          title="Prompt Composer Harness"
          submitLabel="保存测试角色"
        />
        <pre data-testid="saved-payload">{saved ? JSON.stringify(saved, null, 2) : ''}</pre>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
