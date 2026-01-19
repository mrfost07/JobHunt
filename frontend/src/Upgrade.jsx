import { useState } from 'react'
import axios from 'axios'
import './Upgrade.css'

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3001/api'

function Upgrade({ onClose, onSuccess, currentLimit }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleUpgrade = async () => {
        setLoading(true)
        setError('')

        try {
            const res = await axios.post(`${API_URL}/subscribe`)
            // Redirect to GCash checkout
            window.location.href = res.data.checkoutUrl
        } catch (err) {
            console.error('Upgrade error:', err)
            const detail = err.response?.data?.error || err.message
            // Sometimes PayMongo returns detailed errors in a different format, handle generic 500
            const msg = typeof detail === 'string' ? detail : 'Payment service error. Please try again.'
            setError(msg)
            setLoading(false)
        }
    }

    return (
        <div className="upgrade-overlay" onClick={onClose}>
            <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
                <button className="upgrade-close" onClick={onClose}>×</button>

                <div className="upgrade-header">
                    <h2>Upgrade to Pro</h2>
                    <p>Unlock more job matching power</p>
                </div>

                <div className="upgrade-comparison">
                    <div className="plan free">
                        <div className="plan-name">Free</div>
                        <div className="plan-price">₱0</div>
                        <div className="plan-limit">50 jobs</div>
                        <div className="plan-current">Current Plan</div>
                    </div>

                    <div className="plan pro">
                        <div className="plan-badge">Recommended</div>
                        <div className="plan-name">Pro</div>
                        <div className="plan-price">₱100<span>/month</span></div>
                        <div className="plan-limit">500 jobs</div>
                        <ul className="plan-features">
                            <li>10x more job matches</li>
                            <li>Priority email delivery</li>
                            <li>Monthly billing</li>
                        </ul>
                    </div>
                </div>

                {error && <div className="upgrade-error">{error}</div>}

                <button
                    className="upgrade-btn"
                    onClick={handleUpgrade}
                    disabled={loading}
                >
                    {loading ? 'Redirecting to GCash...' : 'Pay with GCash'}
                </button>

                <div className="upgrade-footer">
                    <p>Secure payment via PayMongo</p>
                </div>
            </div>
        </div>
    )
}

export default Upgrade
