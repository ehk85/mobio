export const PrivacyPolicyPage = () => {
  return (
    <main className="layout section-page-layout legal-layout">
      <section className="section-page-header legal-header">
        <p className="hero-kicker">LEGAL</p>
        <h1>Politique de confidentialité</h1>
        <p>Dernière mise à jour : 25/02/2026</p>
      </section>

      <section className="card legal-card">
        <h2>1. Données collectées</h2>
        <p>
          Mobio Travel collecte les informations nécessaires à la création de compte, la gestion des réservations
          et l’amélioration du service : nom, email, informations de connexion et données liées aux recherches de
          voyages.
        </p>

        <h2>2. Utilisation des données</h2>
        <p>
          Vos données sont utilisées pour fournir les fonctionnalités de réservation vols/hôtels, sécuriser
          l’authentification, traiter les paiements et vous assister via le support client.
        </p>

        <h2>3. Conservation</h2>
        <p>
          Les données sont conservées uniquement pendant la durée nécessaire aux finalités décrites, puis supprimées
          ou anonymisées selon les obligations légales applicables.
        </p>

        <h2>4. Partage</h2>
        <p>
          Certaines données peuvent être transmises à des partenaires techniques (API de réservation, hébergement,
          paiement) uniquement pour exécuter le service demandé.
        </p>

        <h2>5. Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la rectification ou la suppression de vos données en contactant
          contact@mobio-travel.com.
        </p>
      </section>
    </main>
  );
};
