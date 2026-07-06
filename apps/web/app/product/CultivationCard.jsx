import React from 'react';
import { Calendar, Tag, BookOpen, MessageSquare, MapPin } from 'lucide-react';

/**
 * CultivationCard — 修行卡片组件
 * 
 * 展示纪要、心境、留言或线索卡片。支持翻转查看详细描述。
 */
export default function CultivationCard({ card }) {
  if (!card) return null;

  const { type, title, summary, image, timestamp, rarity } = card;

  const getTypeIcon = () => {
    switch (type) {
      case 'retreat': return <Calendar size={14} />;
      case 'mind': return <BookOpen size={14} />;
      case 'message': return <MessageSquare size={14} />;
      case 'clue': return <Tag size={14} />;
      case 'stage': return <MapPin size={14} />;
      default: return <Tag size={14} />;
    }
  };

  const getRarityLabel = () => {
    switch (rarity) {
      case 'legendary': return '绝世';
      case 'rare': return '珍稀';
      default: return '凡品';
    }
  };

  const formattedDate = new Date(timestamp).toLocaleDateString();

  return (
    <div className={`cultivation-card rarity-${rarity || 'common'}`}>
      <div className="card-inner">
        <div className="card-front">
          <div className="card-image-container">
            <img src={image} alt={title} className="card-image" />
            <div className="card-type-badge">
              {getTypeIcon()}
              <span>{getRarityLabel()}</span>
            </div>
          </div>
          <div className="card-info">
            <h4 className="card-title">{title}</h4>
            <p className="card-summary">{summary.length > 40 ? summary.substring(0, 40) + '...' : summary}</p>
            <div className="card-footer">
              <span className="card-date">{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
