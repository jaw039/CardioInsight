let data = [];
let selectedGenders = new Set(["male", "female"]);
let genderLookup = {}; 

// Load subject-info.csv first
d3.csv("subject-info.csv").then((subjectData) => {
    subjectData.forEach(d => {
        if (d.ID !== undefined && d.ID !== null) {
            let trimmedID = String(d.ID).trim(); 
            let trimmedSex = String(d.Sex).trim();
            
            if (trimmedSex === "1") {
                genderLookup[trimmedID] = "female";
            } else if (trimmedSex === "0") {
                genderLookup[trimmedID] = "male";
            }
        }
    });

    return d3.csv("test_measure.csv");
}).then((rawData) => {

    data = rawData.map(d => {
        let trimmedID = String(d.ID).trim(); 
        let VO2Value = +d.VO2;
        let gender = genderLookup[trimmedID];
        
        VO2Value = VO2Value / 100;
                
        return {
            VO2: VO2Value,
            gender: gender || "unknown" 
        };
    }).filter(d => d.VO2 >= 0 && d.VO2 <= 80); 

    createHistogram();
}).catch(error => console.error("Error loading CSV:", error));

// Function to create the histogram
function createHistogram() {
    d3.select("#chart").selectAll("*").remove();  // Clear existing chart

    const width = 960, height = 500, margin = { top: 20, right: 20, bottom: 60, left: 60 };
    
    // Create tooltip div if it doesn't exist
    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "3px")
            .style("padding", "8px")
            .style("pointer-events", "none");
    }

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleLinear()
        .domain([0, 60])  
        .range([margin.left, width - margin.right]);

    const histogram = d3.bin()
        .value(d => d.VO2)
        .domain(x.domain())
        .thresholds(x.ticks(30));

    const binsMale = histogram(data.filter(d => d.gender === "male"));
    const binsFemale = histogram(data.filter(d => d.gender === "female"));

    const y = d3.scaleLinear()
        .domain([0, d3.max([...binsMale, ...binsFemale], d => d.length) || 1])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("VO2 Levels (ml/kg/min)");

    // Y-axis
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Frequency/Count");

    function updateChart() {
        svg.selectAll(".bar").remove();

        if (selectedGenders.has("male")) {
            svg.append("g")
                .selectAll("rect")
                .data(binsMale)
                .join("rect")
                .attr("class", "bar bar-male")
                .attr("x", d => x(d.x0) + 1)
                .attr("width", d => x(d.x1) - x(d.x0) - 1)
                .attr("y", d => y(d.length))
                .attr("height", d => y(0) - y(d.length))
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltip.html(`
                        <strong>Male</strong><br/>
                        Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br/>
                        Count: ${d.length}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        }

        if (selectedGenders.has("female")) {
            svg.append("g")
                .selectAll("rect")
                .data(binsFemale)
                .join("rect")
                .attr("class", "bar bar-female")
                .attr("x", d => x(d.x0) + 1)
                .attr("width", d => x(d.x1) - x(d.x0) - 1)
                .attr("y", d => y(d.length))
                .attr("height", d => y(0) - y(d.length))
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltip.html(`
                        <strong>Female</strong><br/>
                        Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br/>
                        Count: ${d.length}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        }
    }
    updateChart();

    // Button event handlers
    d3.select("#maleButton").on("click", function() {
        toggleFilter("male", this);
    });

    d3.select("#femaleButton").on("click", function() {
        toggleFilter("female", this);
    });

    function toggleFilter(gender, button) {
        if (selectedGenders.has(gender)) {
            selectedGenders.delete(gender);
            button.classList.remove("active");
        } else {
            selectedGenders.add(gender);
            button.classList.add("active");
        }
        updateChart();
    }
}