import { useState } from 'react'
import './Donate.css'

function Donate({ onClose }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText('fostanesmarkrenier@gmail.com')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="donate-overlay" onClick={onClose}>
            <div className="donate-modal" onClick={e => e.stopPropagation()}>
                <button className="donate-close" onClick={onClose}>×</button>

                <div className="donate-header">
                    <h2>Support JobHunt</h2>
                    <p>Your support helps keep this project running</p>
                </div>

                <div className="donate-qr">
                    <img src="/src/assets/BuyMe.jpg" alt="GCash QR Code" />
                </div>

                <div className="donate-instructions">
                    <div className="donate-step">
                        <span className="step-num">1</span>
                        <span>Open your GCash or any InstaPay-enabled app</span>
                    </div>
                    <div className="donate-step">
                        <span className="step-num">2</span>
                        <span>Scan the QR code above</span>
                    </div>
                    <div className="donate-step">
                        <span className="step-num">3</span>
                        <span>Enter any amount you wish to donate</span>
                    </div>
                </div>

                <div className="donate-footer">
                    <p>Thank you for your generosity!</p>
                </div>
            </div>
        </div>
    )
}

export default Donate
