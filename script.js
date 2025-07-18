// Application State
let members = [];
let currentPage = "dashboard";
let editingPaymentId = null;

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  loadMembers();
  initializeEventListeners();
  checkLoginStatus();
});

// Event Listeners
function initializeEventListeners() {
  // Login form
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("togglePassword").addEventListener("click", togglePasswordVisibility);

  // Navigation
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => navigateToPage(e.target.dataset.page));
  });

  // Quick actions
  document.querySelectorAll("[data-page]").forEach((item) => {
    item.addEventListener("click", (e) => {
      const page = e.target.dataset.page || e.target.closest("[data-page]").dataset.page;
      if (page) navigateToPage(page);
    });
  });

  // Add member form
  document.getElementById("addMemberForm").addEventListener("submit", handleAddMember);

  // Search
  document.getElementById("memberSearch").addEventListener("input", handleSearch);

  // Modal
  document.querySelector(".modal-close").addEventListener("click", closePaymentModal);
  document.getElementById("cancelPayment").addEventListener("click", closePaymentModal);
  document.getElementById("confirmPayment").addEventListener("click", confirmPaymentUpdate);

  // Set default dates
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("memberDateInscription").value = today;
  document.getElementById("memberDernierPaiement").value = today;

  // Subscription info
  document.getElementById("memberDureeAbonnement").addEventListener("change", updateSubscriptionInfo);
  document.getElementById("memberDernierPaiement").addEventListener("change", updateSubscriptionInfo);
}

// Authentication
function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem("gym_logged_in") === "true";
  if (isLoggedIn) {
    showMainApp();
  } else {
    showLoginPage();
  }
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorDiv = document.getElementById("loginError");

  if (username === "admin" && password === "gym2024") {
    localStorage.setItem("gym_logged_in", "true");
    showMainApp();
    errorDiv.style.display = "none";
  } else {
    errorDiv.textContent = "Nom d'utilisateur ou mot de passe incorrect";
    errorDiv.style.display = "block";
  }
}

function handleLogout() {
  localStorage.removeItem("gym_logged_in");
  showLoginPage();
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.querySelector("#togglePassword i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.className = "fas fa-eye-slash";
  } else {
    passwordInput.type = "password";
    toggleIcon.className = "fas fa-eye";
  }
}

function showLoginPage() {
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("mainApp").style.display = "none";
}

function showMainApp() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainApp").style.display = "block";

  // Pas de création automatique de données de démo
  updateDashboard();
  renderMembers();
  renderLatePayments();
  startAutomaticRetardCheck();
  addRealtimeStatusIndicator();

  console.log("✅ Système de gestion Biig Ramy démarré");
}

// Navigation
function navigateToPage(page) {
  if (!page) return;

  // Update navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });
  document.querySelector(`[data-page="${page}"]`).classList.add("active");

  // Update pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  const pageElement = document.getElementById(page + "Page");
  if (pageElement) {
    pageElement.classList.add("active");
  }

  currentPage = page;

  // Update content based on page
  if (page === "dashboard") {
    updateDashboard();
  } else if (page === "members") {
    renderMembers();
  } else if (page === "latePayments") {
    renderLatePayments();
  }

  updateNavigationBadges();
}

// Data Management
function loadMembers() {
  const savedMembers = localStorage.getItem("gym_members");
  if (savedMembers) {
    members = JSON.parse(savedMembers);
  }
}

function saveMembers() {
  localStorage.setItem("gym_members", JSON.stringify(members));
  updateDashboard();
  renderMembers();
  renderLatePayments();
  updateNavigationBadges();
}

// Member Management
function handleAddMember(e) {
  e.preventDefault();

  const member = {
    id: Date.now().toString(),
    nom: document.getElementById("memberNom").value,
    prenom: document.getElementById("memberPrenom").value,
    montant: Number.parseFloat(document.getElementById("memberMontant").value),
    dureeAbonnement: Number.parseInt(document.getElementById("memberDureeAbonnement").value),
    dateInscription: document.getElementById("memberDateInscription").value,
    dernierPaiement: document.getElementById("memberDernierPaiement").value,
  };

  members.push(member);
  saveMembers();

  // Reset form
  document.getElementById("addMemberForm").reset();
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("memberDateInscription").value = today;
  document.getElementById("memberDernierPaiement").value = today;
  updateSubscriptionInfo();

  navigateToPage("members");
}

function updateSubscriptionInfo() {
  const duree = parseInt(document.getElementById("memberDureeAbonnement").value) || 1;
  const paymentDate = document.getElementById("memberDernierPaiement").value;
  
  if (!paymentDate) return;
  
  const endDate = getSubscriptionEndDate(paymentDate, duree);
  const daysLeft = getDaysLeft(paymentDate, duree);
  const statusInfo = getSubscriptionStatus(paymentDate, duree);
  
  document.getElementById("endDateDisplay").textContent = formatDate(endDate.toISOString().split("T")[0]);
  document.getElementById("daysLeftDisplay").textContent = daysLeft > 0 ? `${daysLeft} jours` : `${Math.abs(daysLeft)} jours de retard`;
  document.getElementById("statusDisplay").textContent = statusInfo.text;
  document.getElementById("statusDisplay").className = statusInfo.class;
}

function getSubscriptionEndDate(dernierPaiement, dureeAbonnement) {
  try {
    const lastPayment = new Date(dernierPaiement);
    if (isNaN(lastPayment.getTime())) {
      return new Date();
    }

    const endDate = new Date(lastPayment);
    endDate.setMonth(endDate.getMonth() + dureeAbonnement);
    return endDate;
  } catch (error) {
    console.error("Erreur dans getSubscriptionEndDate:", error);
    return new Date();
  }
}

function getDaysLeft(dernierPaiement, dureeAbonnement) {
  try {
    const lastPayment = new Date(dernierPaiement);
    const today = new Date();

    if (isNaN(lastPayment.getTime())) {
      return 0;
    }

    const endDate = new Date(lastPayment);
    endDate.setMonth(endDate.getMonth() + dureeAbonnement);

    const timeDiff = endDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    return daysDiff;
  } catch (error) {
    console.error("Erreur dans getDaysLeft:", error);
    return 0;
  }
}

function isPaymentLate(dernierPaiement, dureeAbonnement = 1) {
  try {
    if (!dernierPaiement || !dureeAbonnement) {
      return false;
    }

    const lastPayment = new Date(dernierPaiement);
    const today = new Date();

    if (isNaN(lastPayment.getTime())) {
      return false;
    }

    const endDate = new Date(lastPayment);
    endDate.setMonth(endDate.getMonth() + dureeAbonnement);

    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDateNormalized = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    return todayNormalized > endDateNormalized;
  } catch (error) {
    console.error("Erreur dans isPaymentLate:", error);
    return false;
  }
}

function getSubscriptionStatus(dernierPaiement, dureeAbonnement) {
  const daysLeft = getDaysLeft(dernierPaiement, dureeAbonnement);
  if (daysLeft < 0) {
    return { text: "En retard", class: "expired" };
  } else if (daysLeft <= 3) {
    return { text: "À expirer", class: "warning" };
  } else {
    return { text: "À jour", class: "active" };
  }
}

function updatePayment(memberId, paymentDate = null) {
  const dateToUse = paymentDate || new Date().toISOString().split("T")[0];
  members = members.map((member) => (member.id === memberId ? { ...member, dernierPaiement: dateToUse } : member));
  saveMembers();
}

function deleteMember(memberId) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) {
    members = members.filter((member) => member.id !== memberId);
    saveMembers();
  }
}

function editPaymentDate(memberId, currentDate) {
  editingPaymentId = memberId;
  document.getElementById("paymentDate").value = currentDate;
  document.getElementById("paymentModal").style.display = "block";
}

function closePaymentModal() {
  document.getElementById("paymentModal").style.display = "none";
  editingPaymentId = null;
}

function confirmPaymentUpdate() {
  if (editingPaymentId) {
    const newDate = document.getElementById("paymentDate").value;
    updatePayment(editingPaymentId, newDate);
    closePaymentModal();
  }
}

// Search
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  renderMembers(searchTerm);
}

// Utility Functions
function getSubscriptionDuration(dateInscription) {
  const inscriptionDate = new Date(dateInscription);
  const today = new Date();
  const diffTime = today.getTime() - inscriptionDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return "Aujourd'hui";
  } else if (diffDays < 30) {
    return `${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (remainingDays === 0) {
      return `${months} mois`;
    } else {
      return `${months} mois et ${remainingDays} jour${remainingDays > 1 ? "s" : ""}`;
    }
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    const months = Math.floor(remainingDays / 30);

    if (months === 0) {
      return `${years} an${years > 1 ? "s" : ""}`;
    } else {
      return `${years} an${years > 1 ? "s" : ""} et ${months} mois`;
    }
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("fr-FR");
}

// Rendering Functions
function updateDashboard() {
  const lateMembers = members.filter((member) => isPaymentLate(member.dernierPaiement, member.dureeAbonnement));
  const totalRevenue = members.reduce((total, member) => total + member.montant, 0);
  const averageSubscription = members.length > 0 ? totalRevenue / members.length : 0;

  // Update stats
  document.getElementById("totalMembers").textContent = members.length;
  document.getElementById("latePayments").textContent = lateMembers.length;
  document.getElementById("totalRevenue").textContent = `${totalRevenue.toFixed(2)} DH`;
  document.getElementById("averageSubscription").textContent = `${averageSubscription.toFixed(2)} DH`;

  // Update alert card
  const alertCard = document.getElementById("alertCard");
  const alertMessage = document.getElementById("alertMessage");
  if (lateMembers.length > 0) {
    alertCard.style.display = "block";
    alertMessage.textContent = `${lateMembers.length} membre(s) ont des paiements en retard`;
  } else {
    alertCard.style.display = "none";
  }

  // Update recent members
  renderRecentMembers();

  // Update quick actions
  const lateActionBtn = document.getElementById("lateActionBtn");
  const lateActionCount = document.getElementById("lateActionCount");
  if (lateMembers.length > 0) {
    lateActionBtn.style.display = "block";
    lateActionCount.textContent = lateMembers.length;
  } else {
    lateActionBtn.style.display = "none";
  }

  updateNavigationBadges();
}

function renderRecentMembers() {
  const recentMembersContainer = document.getElementById("recentMembers");
  const recentMembers = members.slice(-5).reverse();

  if (recentMembers.length === 0) {
    recentMembersContainer.innerHTML = '<p class="empty-state">Aucun membre inscrit</p>';
    return;
  }

  recentMembersContainer.innerHTML = recentMembers
    .map(
      (member) => `
        <div class="member-item">
            <div class="member-info">
                <h4 class="member-name">${member.prenom} ${member.nom}</h4>
                <p class="member-duration">Inscrit depuis ${getSubscriptionDuration(member.dateInscription)}</p>
            </div>
            <div class="member-stats">
                <p class="amount">${member.montant.toFixed(2)} DH</p>
                <p class="status ${isPaymentLate(member.dernierPaiement, member.dureeAbonnement) ? "late" : "current"}">
                    ${isPaymentLate(member.dernierPaiement, member.dureeAbonnement) ? "En retard" : "À jour"}
                </p>
            </div>
        </div>
    `,
    )
    .join("");
}

function renderMembers(searchTerm = "") {
  const filteredMembers = members.filter(
    (member) => member.nom.toLowerCase().includes(searchTerm) || member.prenom.toLowerCase().includes(searchTerm),
  );

  document.getElementById("memberCount").textContent = filteredMembers.length;

  const tbody = document.getElementById("membersTableBody");
  const noMembersMessage = document.getElementById("noMembersMessage");

  if (filteredMembers.length === 0) {
    tbody.innerHTML = "";
    noMembersMessage.style.display = "block";
    return;
  }

  noMembersMessage.style.display = "none";
  tbody.innerHTML = filteredMembers
    .map((member, index) => {
      const duree = member.dureeAbonnement || 1;
      const isLate = isPaymentLate(member.dernierPaiement, duree);
      const statusInfo = getSubscriptionStatus(member.dernierPaiement, duree);
      const endDate = getSubscriptionEndDate(member.dernierPaiement, duree);

      return `
        <tr style="background: ${index % 2 === 0 ? "white" : "#f9fafb"}">
            <td>
                <div>
                    <p class="member-name">${member.prenom} ${member.nom}</p>
                    <p class="member-duration">Membre depuis ${getSubscriptionDuration(member.dateInscription)}</p>
                    <p class="member-duration">Abonnement: ${duree} mois</p>
                </div>
            </td>
            <td>
                <span class="amount">${member.montant.toFixed(2)} DH</span>
                <p class="amount-label">pour ${duree} mois</p>
            </td>
            <td>${formatDate(member.dateInscription)}</td>
            <td>
                <div>
                    <p>${formatDate(member.dernierPaiement)}</p>
                    <p style="font-size: 0.8rem; color: #6b7280;">Fin: ${formatDate(endDate.toISOString().split("T")[0])}</p>
                    <button class="btn-edit" onclick="editPaymentDate('${member.id}', '${member.dernierPaiement}')">
                        Modifier
                    </button>
                </div>
            </td>
            <td>
                <span class="status-badge ${isLate ? "late" : "current"}">
                    <span class="status-dot ${isLate ? "late" : "current"}"></span>
                    ${statusInfo.text}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-success" onclick="updatePayment('${member.id}')">
                        💰 Renouveler
                    </button>
                    <button class="btn btn-danger" onclick="deleteMember('${member.id}')">
                        🗑️ Supprimer
                    </button>
                </div>
            </td>
        </tr>
        `;
    })
    .join("");
}

function renderLatePayments() {
  const lateMembers = members.filter((member) => isPaymentLate(member.dernierPaiement, member.dureeAbonnement));

  document.getElementById("latePaymentsCount").textContent = lateMembers.length;

  const container = document.getElementById("latePaymentsContainer");
  const noLatePayments = document.getElementById("noLatePayments");

  if (lateMembers.length === 0) {
    noLatePayments.style.display = "block";
    const existingCards = container.querySelectorAll(".late-payment-card");
    existingCards.forEach((card) => card.remove());
    return;
  }

  noLatePayments.style.display = "none";

  // Clear existing cards
  const existingCards = container.querySelectorAll(".late-payment-card");
  existingCards.forEach((card) => card.remove());

  // Trier les membres par nombre de jours de retard
  lateMembers.sort((a, b) => {
    const daysLateA = Math.abs(getDaysLeft(a.dernierPaiement, a.dureeAbonnement));
    const daysLateB = Math.abs(getDaysLeft(b.dernierPaiement, b.dureeAbonnement));
    return daysLateB - daysLateA;
  });

  lateMembers.forEach((member, index) => {
    const daysLate = Math.abs(getDaysLeft(member.dernierPaiement, member.dureeAbonnement));
    const endDate = getSubscriptionEndDate(member.dernierPaiement, member.dureeAbonnement);

    // Déterminer le niveau de gravité du retard
    let severityClass = "moderate";
    let severityIcon = "⚠️";
    if (daysLate > 30) {
      severityClass = "severe";
      severityIcon = "🚨";
    } else if (daysLate > 7) {
      severityClass = "high";
      severityIcon = "⚠️";
    }

    const card = document.createElement("div");
    card.className = `late-payment-card ${severityClass}`;
    card.style.animationDelay = `${index * 0.1}s`;
    card.innerHTML = `
      <div class="late-payment-header">
        <div class="late-member-info">
          <h3 class="late-member-name">${member.prenom} ${member.nom}</h3>
          <span class="late-badge ${severityClass}">
            ${severityIcon} ${daysLate} jour${daysLate > 1 ? "s" : ""} de retard
          </span>
        </div>
        <div class="late-priority">
          <span class="priority-indicator ${severityClass}">
            ${severityClass === "severe" ? "URGENT" : severityClass === "high" ? "IMPORTANT" : "MODÉRÉ"}
          </span>
        </div>
      </div>
      <div class="late-payment-details">
        <div class="late-detail">
          <p class="late-detail-label">💰 Montant mensuel</p>
          <p class="late-detail-value amount">${member.montant.toFixed(2)} DH</p>
        </div>
        <div class="late-detail">
          <p class="late-detail-label">📅 Durée abonnement</p>
          <p class="late-detail-value">${member.dureeAbonnement || 1} mois</p>
        </div>
        <div class="late-detail">
          <p class="late-detail-label">📝 Date d'inscription</p>
          <p class="late-detail-value">${formatDate(member.dateInscription)}</p>
        </div>
        <div class="late-detail">
          <p class="late-detail-label">💳 Dernier paiement</p>
          <p class="late-detail-value late">${formatDate(member.dernierPaiement)}</p>
        </div>
        <div class="late-detail">
          <p class="late-detail-label">⏰ Fin d'abonnement</p>
          <p class="late-detail-value late">${formatDate(endDate.toISOString().split("T")[0])}</p>
        </div>
        <div class="late-detail">
          <p class="late-detail-label">👤 Membre depuis</p>
          <p class="late-detail-value">${getSubscriptionDuration(member.dateInscription)}</p>
        </div>
      </div>
      <div class="late-payment-actions">
        <button class="btn btn-success pulse" onclick="updatePayment('${member.id}')">
          💰 Renouveler Maintenant
        </button>
        <button class="btn btn-edit" onclick="editPaymentDate('${member.id}', '${member.dernierPaiement}')">
          📅 Choisir Date
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateNavigationBadges() {
  const lateMembers = members.filter((member) => isPaymentLate(member.dernierPaiement, member.dureeAbonnement));
  const lateCount = document.getElementById("lateCount");
  const alertBadge = document.getElementById("alertBadge");

  lateCount.textContent = lateMembers.length;

  if (lateMembers.length > 0) {
    alertBadge.style.display = "block";
  } else {
    alertBadge.style.display = "none";
  }
}

// Event handlers for dynamic content
document.addEventListener("click", (e) => {
  // Handle late payments card click
  if (e.target.id === "latePaymentsCard" || e.target.closest("#latePaymentsCard")) {
    navigateToPage("latePayments");
  }

  // Handle view late button click
  if (e.target.id === "viewLateBtn") {
    navigateToPage("latePayments");
  }
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  const modal = document.getElementById("paymentModal");
  if (e.target === modal) {
    closePaymentModal();
  }
});

// Automatic payment check
function startAutomaticRetardCheck() {
  console.log("🚀 Démarrage du système de détection automatique des retards...");
  performRetardCheck();
  setInterval(performRetardCheck, 30000);
  setInterval(performDeepRetardCheck, 60000);
}

function performRetardCheck() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("fr-FR");
  console.log(`🔍 [${timeString}] Vérification automatique des retards...`);
  updateAllDisplays();
}

function performDeepRetardCheck() {
  console.log("🔬 Vérification approfondie des abonnements...");
  members.forEach((member) => {
    const isLate = isPaymentLate(member.dernierPaiement, member.dureeAbonnement);
    const endDate = getSubscriptionEndDate(member.dernierPaiement, member.dureeAbonnement);
    const daysLeft = getDaysLeft(member.dernierPaiement, member.dureeAbonnement);

    if (isLate) {
      console.log(`⚠️ ${member.prenom} ${member.nom} - En retard de ${Math.abs(daysLeft)} jour(s)`);
    } else if (daysLeft <= 3) {
      console.log(`⏰ ${member.prenom} ${member.nom} - Expire dans ${daysLeft} jour(s)`);
    }
  });
}

function updateAllDisplays() {
  try {
    updateDashboard();
    updateNavigationBadges();

    if (currentPage === "members") {
      renderMembers();
    } else if (currentPage === "latePayments") {
      renderLatePayments();
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des affichages:", error);
  }
}

function addRealtimeStatusIndicator() {
  const indicator = document.createElement("div");
  indicator.id = "realtime-indicator";
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #059669, #10b981);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    z-index: 999;
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;

  indicator.innerHTML = `
    <div class="status-dot" style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite;"></div>
    <span>Surveillance active</span>
  `;

  document.body.appendChild(indicator);
}