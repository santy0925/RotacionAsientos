// ============================
// Conexión a Supabase
// ============================
const SUPABASE_URL = "https://odtmssqqrpbkyoqrpcqe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdG1zc3FxcnBia3lvcXJwY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTUyNDcsImV4cCI6MjA3MjMzMTI0N30.ikWopqnMIatL1Q2fRcit_lPFwh1JH2ZyHoAukZ_ewyk";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  await loadNumRotativos();
  await loadSeats();
  toggleFixedOptions();
});

// ============================
// Mostrar/ocultar opciones fijos
// ============================
function toggleFixedOptions() {
  const type = document.getElementById("seatType").value;
  const div = document.getElementById("fixedOptions");
  div.style.display = type === "fixed" ? "block" : "none";
}

// ============================
// Cargar cantidad de rotativos desde la base de datos
// ============================
async function loadNumRotativos() {
  const { count, error } = await supabaseClient
    .from("seats")
    .select("*", { count: "exact" })
    .eq("type", "rotating");

  if (error) {
    console.error("Error al cargar la cantidad de asientos rotativos:", error);
    return;
  }
  
  if (count > 0) {
    document.getElementById("numRotativos").value = count;
  }
}

// ============================
// Configurar cantidad exacta de rotativos
// ============================
async function setRotativos() {
  const n = parseInt(document.getElementById("numRotativos").value) || 5;
  if (n < 1) return;

  const { data: currentRot } = await supabaseClient
    .from("seats")
    .select("*")
    .eq("type", "rotating");

  if (currentRot && currentRot.length > 0) {
    const ids = currentRot.map(r => r.id);
    await supabaseClient.from("seats").delete().in("id", ids);
  }

  const seatsToInsert = [];
  for (let i = 1; i <= n; i++) {
    seatsToInsert.push({ number: i, type: "rotating" });
  }
  await supabaseClient.from("seats").insert(seatsToInsert);

  await loadSeats();
}

// ============================
// Agregar persona
// ============================
async function addPerson() {
  const name = document.getElementById("personName").value.trim();
  const type = document.getElementById("seatType").value;
  if (!name) return alert("Escribe un nombre");

  let seatNum;
  if (type === "fixed") {
    // Obtiene el valor del nuevo input
    seatNum = parseInt(document.getElementById("fixedInput").value);
    if (!seatNum || isNaN(seatNum)) return alert("Escribe un número de asiento fijo válido");
  }

  if (type === "fixed") {
    const { data: existingSeat } = await supabaseClient
      .from("seats")
      .select("*")
      .eq("number", seatNum)
      .eq("type", "fixed")
      .maybeSingle();

    if (existingSeat && existingSeat.assigned_member_id) {
      return alert(`El asiento número ${seatNum} ya está ocupado.`);
    }

    const { data: member, error: memberError } = await supabaseClient
      .from("members")
      .insert([{ name }])
      .select()
      .single();
    if (memberError) return alert(memberError.message);

    if (existingSeat) {
      await supabaseClient.from("seats")
        .update({ assigned_member_id: member.id })
        .eq("id", existingSeat.id);
    } else {
      await supabaseClient.from("seats")
        .insert([{ number: seatNum, type: "fixed", assigned_member_id: member.id }])
        .select()
        .single();
    }
  } else if (type === "rotating") {
    const { data: libreRotativo } = await supabaseClient
      .from("seats")
      .select("*")
      .eq("type", "rotating")
      .is("assigned_member_id", null)
      .order("number")
      .limit(1)
      .single();

    if (!libreRotativo) {
      return alert("No hay asientos rotativos libres, aumenta la cantidad.");
    }

    const { data: member, error: memberError } = await supabaseClient
      .from("members")
      .insert([{ name }])
      .select()
      .single();
    if (memberError) return alert(memberError.message);

    await supabaseClient.from("seats")
      .update({ assigned_member_id: member.id })
      .eq("id", libreRotativo.id);

    await supabaseClient.from("seat_assignments")
      .insert({ member_id: member.id, seat_id: libreRotativo.id, mode: "rotating" });
  }

  document.getElementById("personName").value = "";
  if (type === "fixed") {
    document.getElementById("fixedInput").value = "";
  }
  await loadSeats();
}

// ============================
// Rotar asientos (solo ocupados, manteniendo vacíos)
// ============================
async function rotateSeats() {
  const { data: seats } = await supabaseClient
    .from("seats")
    .select("*")
    .eq("type", "rotating")
    .order("number");

  if (!seats || seats.length === 0) return alert("No hay asientos rotativos configurados");

  const assigned = seats.filter(s => s.assigned_member_id).map(s => s.assigned_member_id);
  if (assigned.length <= 1) return alert("No hay suficientes personas para rotar");

  function derangement(arr) {
    if (arr.length < 2) return arr;
    let result;
    do {
      result = [...arr].sort(() => Math.random() - 0.5);
    } while (result.some((v, i) => v === arr[i]));
    return result;
  }

  const rotated = derangement(assigned);

  for (const s of seats) {
    if (s.assigned_member_id) {
      await supabaseClient.from("seats").update({ assigned_member_id: null }).eq("id", s.id);
    }
  }

  for (let i = 0; i < rotated.length; i++) {
    const seat = seats[i];
    if (!seat) continue;
    await supabaseClient.from("seats")
      .update({ assigned_member_id: rotated[i] })
      .eq("id", seat.id);

    await supabaseClient.from("seat_assignments").insert({
      member_id: rotated[i],
      seat_id: seat.id,
      mode: "rotating"
    });
  }

  await loadSeats();
}

// ============================
// Editar / liberar / borrar todos
// ============================
async function editSeat(seatId) {
  const newName = prompt("Nuevo nombre de persona para este asiento:");
  if (!newName) return;

  const { data: member } = await supabaseClient.from("members")
    .insert([{ name: newName }])
    .select()
    .single();

  await supabaseClient.from("seats")
    .update({ assigned_member_id: member.id })
    .eq("id", seatId);

  await supabaseClient.from("seat_assignments")
    .insert({ member_id: member.id, seat_id: seatId, mode: "fixed" });

  await loadSeats();
}

async function clearSeat(seatId) {
  await supabaseClient.from("seats").update({ assigned_member_id: null }).eq("id", seatId);
  await loadSeats();
}

async function clearAllSeats() {
  await supabaseClient.from("seats").update({ assigned_member_id: null }).neq("id", -1);
  await loadSeats();
}

// ============================
// Render
// ============================
async function loadSeats() {
  const { data: seats } = await supabaseClient
    .from("seats")
    .select("*, members:assigned_member_id (id,name)")
    .order("type")
    .order("number");

  const fixedDiv = document.getElementById("fixedSeats");
  const rotDiv = document.getElementById("rotatingSeats");
  fixedDiv.innerHTML = "";
  rotDiv.innerHTML = "";

  seats.forEach(seat => {
    const div = document.createElement("div");
    div.className = `seat ${seat.type}`;

    let actions = "";
    if (seat.type === "fixed") {
      actions = `
        <button class="btn small" onclick="editSeat(${seat.id})">✏️</button>
        <button class="btn small danger" onclick="clearSeat(${seat.id})">♻️</button>
      `;
    } else {
      actions = `<button class="btn small danger" onclick="clearSeat(${seat.id})">♻️</button>`;
    }

    div.innerHTML = `
      <div class="seat-title">${seat.type === "fixed" ? "Fijo" : "Rot"} ${seat.number}</div>
      <div class="${seat.members?.name ? "person" : "empty"}">${seat.members?.name || "Vacío"}</div>
      <div class="actions">${actions}</div>
    `;

    if (seat.type === "fixed") fixedDiv.appendChild(div);
    else rotDiv.appendChild(div);
  });
}