document.addEventListener("DOMContentLoaded", () => {
  const isShopPage = window.location.pathname.endsWith('shop.html');
  const isVerified = isShopPage 
    ? (sessionStorage.getItem("shop_age_verified") === "true")
    : (localStorage.getItem("age_verified") === "true");

  if (!isVerified) {
    const overlay = document.createElement("div");
    overlay.id = "age-gate-overlay";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(5, 5, 10, 0.95); z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(15px);
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: #0d0d12; padding: 40px; border-radius: 24px;
      max-width: 440px; width: 90%; text-align: center;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.25);
      border: 1px solid rgba(0, 240, 255, 0.3);
      font-family: system-ui, sans-serif;
      color: #fff;
    `;

    modal.innerHTML = `
      <div style="margin-bottom: 20px;">
        <span style="font-size: 48px; color: #ff0055; filter: drop-shadow(0 0 10px rgba(255, 0, 85, 0.4));" class="material-symbols-outlined">warning</span>
      </div>
      <h2 style="margin-top:0; font-size: 26px; color: #00f0ff; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);">Age Verification</h2>
      <p style="color: #a0a0ab; margin-bottom: 30px; font-size: 15px; line-height: 1.6;">
        You must be **18 years of age or older** to access Ulap Corner. Vaping products contain nicotine and are restricted to adults. Please verify your age.
      </p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="btn-age-yes" style="flex:1; padding: 14px; background: #00f0ff; color: #002022; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;" onmouseover="this.style.boxShadow='0 0 15px rgba(0, 240, 255, 0.6)'" onmouseout="this.style.boxShadow='none'">I am 18 or older</button>
        <button id="btn-age-no" style="flex:1; padding: 14px; background: #ff0055; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; transition: all 0.2s; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;" onmouseover="this.style.boxShadow='0 0 15px rgba(255, 0, 85, 0.6)'" onmouseout="this.style.boxShadow='none'">I am under 18</button>
      </div>
      <p id="age-error" style="color: #ff0055; margin-top: 20px; font-size: 14px; display: none; font-weight: bold; text-shadow: 0 0 8px rgba(255, 0, 85, 0.3);">Access Denied: You must be at least 18 to view this content.</p>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.body.style.overflow = "hidden"; // Prevent scrolling

    document.getElementById("btn-age-yes").addEventListener("click", () => {
      localStorage.setItem("age_verified", "true");
      if (isShopPage) {
        sessionStorage.setItem("shop_age_verified", "true");
      }
      overlay.remove();
      document.body.style.overflow = ""; // Restore scrolling
    });

    document.getElementById("btn-age-no").addEventListener("click", () => {
      document.getElementById("age-error").style.display = "block";
    });
  }
});
