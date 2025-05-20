function addRow() {
const table = document.getElementById('jobInputs');
const row = document.createElement('tr');
row.innerHTML = `
<td><input type="text" placeholder="♡" /></td>
<td><input type="number" /></td>
<td><input type="number" /></td>
<td><input type="number" /></td>
<td><button class="delete-btn">✖</button></td>
`;
row.querySelector(".delete-btn").addEventListener("click", () => {
row.remove();
});
table.appendChild(row);
}
function resetAll() {
location.reload();
}
function runScheduling() {
const rows = document.querySelectorAll("#jobInputs tr");
const jobs = [];
rows.forEach(row => {
const inputs = row.querySelectorAll("input");
const job = {
name: inputs[0].value || "P" + (jobs.length + 1),
arrivalTime: parseInt(inputs[1].value),
burstTime: parseInt(inputs[2].value),
priority: parseInt(inputs[3].value),
remainingTime: parseInt(inputs[2].value)
};
if (!isNaN(job.arrivalTime) && !isNaN(job.burstTime)) {
jobs.push(job);
}
});
const algo = document.getElementById("algorithm").value;
let schedule = [];
if (algo === "fcfs") {
schedule = fcfs(jobs);
} else if (algo === "sjf") {
schedule = sjf(jobs);
} else if (algo === "preemptive") {
schedule = preemptivePriority(jobs);
} else if (algo === "nonpreemptive") {
schedule = nonPreemptivePriority(jobs);
}
renderSchedule(schedule, jobs);
}
function fcfs(jobs) {
const sorted = [...jobs].sort((a, b) => a.arrivalTime - b.arrivalTime);
const schedule = [];
let currentTime = 0;
sorted.forEach(job => {
if (currentTime < job.arrivalTime) currentTime = job.arrivalTime;
schedule.push({
name: job.name,
start: currentTime,
end: currentTime + job.burstTime
});
job.completionTime = currentTime + job.burstTime;
currentTime += job.burstTime;
});
return schedule;
}
function sjf(jobs) {
const schedule = [];
const jobsLeft = [...jobs];
let time = 0;
while (jobsLeft.length > 0) {
// Get jobs that have arrived and are not yet scheduled
const available = jobsLeft.filter(j => j.arrivalTime <= time);
if (available.length > 0) {
// Pick the one with the shortest burst time
available.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime);
const job = available[0];
// Add it to schedule
schedule.push({
name: job.name,
start: time,
end: time + job.burstTime
});
// Set its completion time
job.completionTime = time + job.burstTime;
// Advance time
time += job.burstTime;
// Remove it from jobsLeft
const index = jobsLeft.indexOf(job);
jobsLeft.splice(index, 1);
} else {
// No job available yet — idle time
time++;
}
}
return schedule;
}
function preemptivePriority(jobs) {
const schedule = [];
let time = 0;
const jobsLeft = jobs.map(j => ({ ...j }));
const jobState = {};
let currentJob = null;
let lastStartTime = 0;
while (jobsLeft.some(j => j.remainingTime > 0)) {
// Get available jobs and sort by priority (lower number = higher priority)
const available = jobsLeft
.filter(j => j.arrivalTime <= time && j.remainingTime > 0)
.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
const nextJob = available[0];
// If the job changes (preemption), push previous job slice
if (!currentJob || currentJob.name !== nextJob.name) {
if (currentJob && currentJob.name !== 'IDLE' && time > lastStartTime) {
schedule.push({ name: currentJob.name, start: lastStartTime, end: time });
}
currentJob = nextJob;
lastStartTime = time;
}
// Run the job for 1 unit
currentJob.remainingTime--;
time++;
// If job finishes, mark completion time and close the slice
if (currentJob.remainingTime === 0) {
schedule.push({ name: currentJob.name, start: lastStartTime, end: time });
const jobOriginal = jobs.find(j => j.name === currentJob.name);
jobOriginal.completionTime = time;
currentJob = null;
}
}
return schedule;
}
function nonPreemptivePriority(jobs) {
  const schedule = [];
  const jobsLeft = [...jobs]; // Copy the jobs array to avoid modifying the original
  let currentTime = 0;

  while (jobsLeft.length > 0) {
    // Get jobs that have arrived and are not yet scheduled
    const available = jobsLeft.filter(job => job.arrivalTime <= currentTime);

    if (available.length > 0) {
      // Sort available jobs by priority (lower number = higher priority), then by arrival time
      available.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);

      // Select the job with the highest priority
      const job = available[0];

      // Add the job to the schedule
      schedule.push({
        name: job.name,
        start: currentTime,
        end: currentTime + job.burstTime
      });

      // Update the job's completion time
      job.completionTime = currentTime + job.burstTime;

      // Advance the current time
      currentTime += job.burstTime;

      // Remove the job from the jobsLeft array
      const index = jobsLeft.indexOf(job);
      jobsLeft.splice(index, 1);
    } else {
      // If no jobs are available, increment the current time (idle time)
      currentTime++;
    }
  }

  return schedule;
}
function renderSchedule(schedule, jobs) {
  const arrivalTimeline = document.getElementById('arrivalTimeline');
  const ganttVisual = document.getElementById("ganttVisual");
  const tatDisplay = document.getElementById('tatResults');
  const wtDisplay = document.getElementById('wtResults');

  // Clear previous content
  arrivalTimeline.innerHTML = '';
  ganttVisual.innerHTML = '';
  tatDisplay.innerHTML = '';
  wtDisplay.innerHTML = '';

  // Render Arrival Timeline
  [...jobs].sort((a, b) => a.arrivalTime - b.arrivalTime).forEach(job => {
    const block = document.createElement('div');
    block.className = 'arrival-block';

    const jobName = document.createElement('div');
    jobName.textContent = job.name;
    jobName.className = 'job-name';

    const arrivalTime = document.createElement('div');
    arrivalTime.textContent = `${job.arrivalTime}`;
    arrivalTime.className = 'arrival-time';

    block.appendChild(jobName);
    block.appendChild(arrivalTime);
    arrivalTimeline.appendChild(block);
  });

  const jobColors = {};
  const colorPalette = ['#f9c6d2', '#b8e2f2', '#ffd59e', '#c2f0c2', '#e0bbff', '#ffc4a3'];
  const getColorForJob = name => {
    if (!jobColors[name]) jobColors[name] = colorPalette[Object.keys(jobColors).length % colorPalette.length];
    return jobColors[name];
  };

  let lastEnd = 0;
  const burstTimeMap = {};
  const jobOrder = [];
  let busyTime = 0;

  // Render Gantt Chart
  schedule.forEach(({ name, start, end }) => {
    // Insert IDLE if there's a gap
    if (start > lastEnd) {
      const idleWrapper = document.createElement("div");
      idleWrapper.className = "gantt-block-wrapper";

      const idleBurst = document.createElement("div");
      idleBurst.className = "burst-label";
      idleBurst.textContent = start - lastEnd;

      const idleCuteBlock = document.createElement("div");
      idleCuteBlock.className = "gantt-block-cute";
      idleCuteBlock.textContent = "I"; // Change "IDLE" to "I"

      const idleTick = document.createElement("div");
      idleTick.className = "time-tick";
      idleTick.textContent = lastEnd;

      idleWrapper.appendChild(idleBurst);
      idleWrapper.appendChild(idleCuteBlock);
      idleWrapper.appendChild(idleTick);
      ganttVisual.appendChild(idleWrapper);
    }

    // Add job to visual Gantt
    const wrapper = document.createElement("div");
    wrapper.className = "gantt-block-wrapper";

    const burst = document.createElement("div");
    burst.className = "burst-label";
    burst.textContent = end - start;

    const cuteBlock = document.createElement("div");
    cuteBlock.className = "gantt-block-cute";
    cuteBlock.textContent = name;
    cuteBlock.style.background = getColorForJob(name);

    const cuteTick = document.createElement("div");
    cuteTick.className = "time-tick";
    cuteTick.textContent = start;

    wrapper.appendChild(burst);
    wrapper.appendChild(cuteBlock);
    wrapper.appendChild(cuteTick);
    ganttVisual.appendChild(wrapper);

    if (name !== 'IDLE') {
      const duration = end - start;
      if (!burstTimeMap[name]) {
        burstTimeMap[name] = 0;
        jobOrder.push(name);
      }
      burstTimeMap[name] += duration;
      busyTime += duration;
    }

    lastEnd = end;
  });

  // Final tick for Gantt Visual
  const finalTime = schedule.length > 0 ? schedule[schedule.length - 1].end : 0;
  const finalTick = document.createElement("div");
  finalTick.className = "time-tick";
  finalTick.textContent = finalTime;
  ganttVisual.appendChild(finalTick);

  // Completion time updates
  schedule.forEach(({ name, end }) => {
    const job = jobs.find(j => j.name === name);
    if (job) job.completionTime = Math.max(job.completionTime || 0, end);
  });

  // TAT, WT, Averages
  let totalTAT = 0, totalWT = 0;
  if (jobs.length === 0 || schedule.length === 0) {
    // Display cute placeholders if no jobs have been executed
    tatDisplay.innerHTML = `<div class="placeholder">🌸 No Turn Around Time yet! 🌸</div>`;
    wtDisplay.innerHTML = `<div class="placeholder">💖 Waiting for jobs to execute! 💖</div>`;
  } else {
    jobs.forEach(job => {
      const tat = job.completionTime - job.arrivalTime; // Turn Around Time = Completion Time - Arrival Time
      const wt = tat - job.burstTime; // Waiting Time = Turn Around Time - Burst Time
      totalTAT += tat;
      totalWT += wt;
      tatDisplay.innerHTML += `${job.name}: ${job.completionTime} - ${job.arrivalTime} = <b>${tat}</b><br>`;
      wtDisplay.innerHTML += `${job.name}: ${tat} - ${job.burstTime} = <b>${wt}</b><br>`;
    });
    const avgTAT = (totalTAT / jobs.length).toFixed(2);
    const avgWT = (totalWT / jobs.length).toFixed(2);
    tatDisplay.innerHTML += `<br><b>Overall Average: ${totalTAT} / ${jobs.length} = ${avgTAT} ms</b>`;
    wtDisplay.innerHTML += `<br><b>Overall Average: ${totalWT} / ${jobs.length} = ${avgWT} ms</b>`;
  }

  // CPU Utilization
  const totalTime = finalTime;
  const burstSumExpression = jobOrder.map(name => `${burstTimeMap[name]}`).join(" + ");
  const utilization = totalTime === 0 ? 0 : Math.round((busyTime / totalTime) * 100);
  document.getElementById('cpuUtil').innerHTML = `${totalTime} / (${burstSumExpression}) × 100 = <b>${utilization}%</b>`;
}
