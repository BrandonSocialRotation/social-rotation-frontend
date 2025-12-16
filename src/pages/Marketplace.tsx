// Marketplace page - browse and purchase content packages
// Features: browse items, preview images, purchase, clone to buckets
import InfoIcon from '../components/InfoIcon'

function Marketplace() {
  return (
    <div>
      <h1 style={{ display: 'inline-flex', alignItems: 'center' }}>
        🛒 Marketplace
        <InfoIcon 
          title="Marketplace"
          content="Browse and purchase pre-made content packages created by other users. Purchase content packages to add them to your buckets, or sell your own content packages to other users. The marketplace allows you to discover new content and monetize your creations."
        />
      </h1>
      <p>Browse and purchase content packages</p>
      <p style={{ marginTop: '2rem', color: '#666' }}>Coming soon...</p>
    </div>
  )
}

export default Marketplace
