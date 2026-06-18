css = """
/* ==========================================
   Expiry Dashboard & Ledger Modal Styles
   ========================================== */
.traffic-light-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.traffic-card {
    background: var(--bg-light);
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    transition: transform 0.2s, box-shadow 0.2s;
    border-top: 5px solid transparent;
}

.traffic-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.1);
}

.traffic-card .traffic-header {
    text-align: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 10px;
    margin-bottom: 15px;
}

.traffic-card .traffic-header h3 {
    margin: 0 0 5px 0;
    font-size: 1.2rem;
}

.traffic-card .subtitle {
    font-size: 0.85rem;
    color: var(--text-color);
    opacity: 0.8;
}

.traffic-red { border-top-color: #c0392b; background: rgba(192, 57, 43, 0.05); }
.traffic-orange { border-top-color: #d35400; background: rgba(211, 84, 0, 0.05); }
.traffic-yellow { border-top-color: #f39c12; background: rgba(243, 156, 18, 0.05); }
.traffic-green { border-top-color: #27ae60; background: rgba(39, 174, 96, 0.05); }
.traffic-blue { border-top-color: #2980b9; background: rgba(41, 128, 185, 0.05); }
.traffic-total { border-top-color: #2c3e50; }

.expiry-item-row {
    background: white;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.expiry-item-row h4 {
    margin: 0 0 8px 0;
    color: var(--primary);
}

.expiry-item-details {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.95rem;
}

.expiry-item-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.btn-activate-offer, .btn-close-item {
    flex: 1;
    padding: 6px;
    border-radius: 6px;
    border: 1px solid var(--border);
    cursor: pointer;
    font-weight: bold;
    transition: 0.2s;
}

.btn-activate-offer:hover, .btn-close-item:hover {
    filter: brightness(0.9);
}

.pulse-btn {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
}

#openLedgerBtn.pulse-btn {
    animation: pulse-purple 2s infinite;
}

@keyframes pulse-purple {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(142, 68, 173, 0.7); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(142, 68, 173, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(142, 68, 173, 0); }
}
"""

with open('style.css', 'a', encoding='utf-8') as f:
    f.write(css)

print("CSS appended successfully.")
