// Quotation Page JavaScript

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const internationalForm = document.getElementById('international-form');
    const localForm = document.getElementById('local-form');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show/hide forms based on selected tab
            if (this.dataset.tab === 'international') {
                internationalForm.style.display = 'flex';
                localForm.style.display = 'none';
            } else {
                internationalForm.style.display = 'none';
                localForm.style.display = 'flex';
            }
            
            // Reset and hide results
            document.getElementById('pricing-results').style.display = 'none';
        });
    });

    // International form submission
    internationalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateInternationalShipping();
    });

    // Local form submission
    localForm.addEventListener('submit', function(e) {
        e.preventDefault();
        calculateLocalShipping();
    });
});

// Calculate international shipping cost
function calculateInternationalShipping() {
    const pickupCountry = document.getElementById('pickup-country').value;
    const destinationCountry = document.getElementById('destination-country').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const deliverySpeed = document.getElementById('delivery-speed').value;

    if (!pickupCountry || !destinationCountry || !weight || !deliverySpeed) {
        alert('Please fill in all required fields');
        return;
    }

    // Base rate calculation (simplified)
    let baseRate = 15; // Base rate per kg
    let speedMultiplier = 1;

    switch(deliverySpeed) {
        case 'express':
            speedMultiplier = 1.8;
            break;
        case 'standard':
            speedMultiplier = 1.3;
            break;
        case 'economy':
            speedMultiplier = 1.0;
            break;
    }

    const estimatedCost = (baseRate * weight * speedMultiplier).toFixed(2);

    // Display results
    displayResults(
        `${pickupCountry.charAt(0).toUpperCase() + pickupCountry.slice(1)} → ${destinationCountry.charAt(0).toUpperCase() + destinationCountry.slice(1)}`,
        `${weight} KG`,
        deliverySpeed.charAt(0).toUpperCase() + deliverySpeed.slice(1),
        `$${estimatedCost}`
    );
}

// Calculate local shipping cost
function calculateLocalShipping() {
    const pickupState = document.getElementById('local-pickup-state').value;
    const destinationState = document.getElementById('local-destination-state').value;
    const weight = parseFloat(document.getElementById('local-weight').value);
    const deliverySpeed = document.getElementById('local-delivery-speed').value;

    if (!pickupState || !destinationState || !weight || !deliverySpeed) {
        alert('Please fill in all required fields');
        return;
    }

    // Base rate calculation (simplified)
    let baseRate = 5; // Base rate per kg for local
    let speedMultiplier = 1;

    switch(deliverySpeed) {
        case 'same-day':
            speedMultiplier = 2.0;
            break;
        case 'next-day':
            speedMultiplier = 1.5;
            break;
        case 'standard':
            speedMultiplier = 1.0;
            break;
    }

    const estimatedCost = (baseRate * weight * speedMultiplier).toFixed(2);

    // Display results
    displayResults(
        `${pickupState.charAt(0).toUpperCase() + pickupState.slice(1)} → ${destinationState.charAt(0).toUpperCase() + destinationState.slice(1)}`,
        `${weight} KG`,
        deliverySpeed.replace('-', ' ').charAt(0).toUpperCase() + deliverySpeed.replace('-', ' ').slice(1),
        `₦${(estimatedCost * 750).toFixed(2)}` // Convert to Naira (approximate)
    );
}

// Display results
function displayResults(route, weight, speed, cost) {
    document.getElementById('result-route').textContent = route;
    document.getElementById('result-weight').textContent = weight;
    document.getElementById('result-speed').textContent = speed;
    document.getElementById('result-cost').textContent = cost;

    // Show results section
    document.getElementById('pricing-results').style.display = 'block';

    // Smooth scroll to results
    document.getElementById('pricing-results').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
}

// Reset form
function resetForm() {
    // Reset all forms
    document.getElementById('international-form').reset();
    document.getElementById('local-form').reset();
    
    // Hide results
    document.getElementById('pricing-results').style.display = 'none';
}
