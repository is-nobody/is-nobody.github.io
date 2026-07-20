let currentTheme = 'dark';

function toggleTheme() {
    const html = document.documentElement;
    if (currentTheme === 'dark') {
        html.classList.remove('dark');
        html.classList.add('light');
        currentTheme = 'light';
        document.getElementById('theme-icon-light').style.display = 'block';
        document.getElementById('theme-icon-dark').style.display = 'none';
        if (window.editor) {
            monaco.editor.setTheme('apex-light');
        }
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
        currentTheme = 'dark';
        document.getElementById('theme-icon-light').style.display = 'none';
        document.getElementById('theme-icon-dark').style.display = 'block';
        if (window.editor) {
            monaco.editor.setTheme('apex-dark');
        }
    }
    updateLogo();
}

function updateLogo() {
    const logoLight = document.querySelector('.logo-light-img');
    const logoDark = document.querySelector('.logo-dark-img');
    if (logoLight && logoDark) {
        if (currentTheme === 'dark') {
            logoLight.style.display = 'block';
            logoDark.style.display = 'none';
        } else {
            logoLight.style.display = 'none';
            logoDark.style.display = 'block';
        }
    }
}

function initTheme() {
    const html = document.documentElement;
    if (html.classList.contains('light')) {
        currentTheme = 'light';
        document.getElementById('theme-icon-light').style.display = 'block';
        document.getElementById('theme-icon-dark').style.display = 'none';
    } else {
        currentTheme = 'dark';
        document.getElementById('theme-icon-light').style.display = 'none';
        document.getElementById('theme-icon-dark').style.display = 'block';
    }
    updateLogo();
    if (window.location.pathname.includes('learn.html')) {
        const autoBtn = document.getElementById('auto-button');
        if (autoBtn) autoBtn.style.display = 'none';
    }
}

window.toggleTheme = toggleTheme;
window.initTheme = initTheme;