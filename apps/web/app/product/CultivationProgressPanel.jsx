import React, { useState } from 'react';
import { Shield, MessageSquare, Clock, Book, LayoutGrid } from 'lucide-react';
import CultivationCard from './CultivationCard';

/**
 * CultivationProgressPanel — 修行进度与突破门槛面板
 * 
 * 展示当前的修行境界、修为进度以及下一阶段的突破要求。
 * 新增：藏经阁（Collection）选项卡，用于展示获得的卡片。
 */
export default function CultivationProgressPanel({ progression, onClose }) {
  const [activeTab, setActiveTab] = useState('status'); // status | collection

  if (!progression) return null;

  const { 
    current_stage, 
    next_stage, 
    progress, 
    chat_count, 
    visit_count, 
    percent, 
    requirements,
    collection = []
  } = progression;

  return (
    <div className="cultivation-progress-panel-overlay" onClick={onClose}>
      <div className="cultivation-progress-card" onClick={e => e.stopPropagation()}>
        <div className="cultivation-progress-header">
          <div className="stage-badge">{current_stage}</div>
          <h3>修行进度</h3>
          <button className="btn-close-progress" onClick={onClose}>&times;</button>
        </div>

        <div className="progress-tabs">
          <button 
            className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            <LayoutGrid size={16} /> 境界
          </button>
          <button 
            className={`tab-btn ${activeTab === 'collection' ? 'active' : ''}`}
            onClick={() => setActiveTab('collection')}
          >
            <Book size={16} /> 藏经阁 ({collection.length})
          </button>
        </div>

        {activeTab === 'status' ? (
          <>
            <div className="progress-section">
              <div className="progress-labels">
                <span>当前修为: {progress.toLocaleString()}</span>
                <span>下一境界: {next_stage}</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
              </div>
              <p className="progress-percent">{percent}%</p>
            </div>

            {requirements && (
              <div className="requirements-section">
                <h4>突破门槛</h4>
                <div className="requirement-item">
                  <div className="req-icon"><Shield size={16} /></div>
                  <div className="req-text">
                    <span>修为: {progress.toLocaleString()} / {requirements.progress.toLocaleString()}</span>
                    <div className={`req-status ${progress >= requirements.progress ? 'done' : ''}`}></div>
                  </div>
                </div>
                <div className="requirement-item">
                  <div className="req-icon"><MessageSquare size={16} /></div>
                  <div className="req-text">
                    <span>对话轮次: {chat_count} / {requirements.chats}</span>
                    <div className={`req-status ${chat_count >= requirements.chats ? 'done' : ''}`}></div>
                  </div>
                </div>
                <div className="requirement-item">
                  <div className="req-icon"><Clock size={16} /></div>
                  <div className="req-text">
                    <span>到访次数: {visit_count} / {requirements.visits}</span>
                    <div className={`req-status ${visit_count >= requirements.visits ? 'done' : ''}`}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="collection-section">
            {collection.length > 0 ? (
              <div className="cultivation-cards-grid">
                {collection.map(card => (
                  <CultivationCard key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <div className="empty-collection">
                <p>暂无典藏。通过闭关修炼或与 NPC 深度互动可获得修行卡片。</p>
              </div>
            )}
          </div>
        )}

        <div className="progress-footer">
          <p className="hint muted">提示：离线闭关、增加互动均可精进修为。境界提升后可解锁更多空间权能。</p>
        </div>
      </div>
    </div>
  );
}
