// ============================
// Conexión a Supabase
// ============================
const SUPABASE_URL = "https://odtmssqqrpbkyoqrpcqe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdG1zc3FxcnBia3lvcXJwY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTUyNDcsImV4cCI6MjA3MjMzMTI0N30.ikWopqnMIatL1Q2fRcit_lPFwh1JH2ZyHoAukZ_ewyk";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fixedSeatData = [
  { office: 701, number: 1, name: "Fabiana Ospina Londoño" },
  { office: 701, number: 2, name: "Erika Gómez Tangarife" },
  { office: 701, number: 3, name: "Brayan Velasco" },
  { office: 701, number: 4, name: "Liseth Rivera" },
  { office: 701, number: 5, name: "Pedro Pablo Salazar" },
  { office: 701, number: 6, name: "Jimena Florez" },
  { office: 701, number: 7, name: "Sara Gómez" },
  { office: 701, number: 8, name: "Maria Fernanda Londoño" },
  { office: 701, number: 9, name: "Juan Felipe Salgado" },
  { office: 701, number: 10, name: "Paula Castellanos" },
  { office: 701, number: 11, name: "Eduardo Henao" },
  { office: 701, number: 12, name: "Marisol Acero" },
  { office: 701, number: 13, name: "Julian Albornoz" },
  { office: 701, number: 14, "name": "Frank Rodriguez" },
  { office: 701, number: 15, "name": "Ivan Fontalvo" },
  { office: 701, number: "Sofa 1-1", name: "Daniela Bonilla" },
  { office: 701, number: "Sofa 1-2", name: "Nelson Galvez" },
  { office: 701, number: "Sofa 1-3", name: "Hernando Moreno" },
  { office: 701, number: "Sofa 1-4", name: "Julian Mejia" },
  { office: 701, number: "Sofa 2-1", name: "Fernan Sanchez" },
  { office: 701, number: "Sofa 2-2", name: "Cristian Diaz" },
  { office: 701, number: "Sofa 2-3", name: "Santiago Cardona Herrera" },
  { office: 701, number: "Sofa 2-4", name: "Cesar Cardona" },
  { office: 702, number: 1, name: "Carolina Sanchez" },
  { office: 702, number: 2, name: "Cristian Montes" },
  { office: 702, number: 3, name: "Jimena Henao" },
  { office: 702, number: 4, name: "Vanessa Mejia" },
  { office: 702, number: 5, name: "Daniela Gonzalez" },
  { office: 702, number: 6, name: "Nestor Ospina" },
  { office: 702, number: 7, name: "Birman Cardona" },
  { office: 702, number: 8, name: "Jenny Zuluaga" },
  { office: 702, number: 9, name: "Sergio Molina" },
  { office: 702, number: 10, name: "Luis Robles" },
];

let numRotativos = 5;

document.addEventListener("DOMContentLoaded", async ()=>{
  await initializeFixedSeats();
  await loadSeats();
  updateFixedOptions();
  toggleFixedOptions();
});

// ============================
// Funciones de inicialización y utilidades
// ============================
async function initializeFixedSeats() {
  const { count } = await supabaseClient
    .from("seats")
    .select("*", { count: "exact" })
    .eq("type", "fixed");

  if (count > 0) return;

  for (const seat of fixedSeatData) {
    const { data: member } = await supabaseClient
      .from("members")
      .insert({ name: seat.name })
      .select()
      .single();

    await supabaseClient
      .from("seats")
      .insert({
        number: `${seat.office}-${seat.number}`,
        type: "fixed",
        assigned_member_id: member.id
      });
  }
}

function toggleFixedOptions() {
  const type = document.getElementById("seatType").value;
  const div = document.getElementById("fixedOptions");
  div.style.display = type === "fixed" ? "block" : "none";
}

// ============================
// Configurar cantidad exacta de rotativos
// ============================
async function setRotativos() {
  const n = parseInt(document.getElementById("numRotativos").value) || numRotativos;
  if (n < 1) return;
  numRotativos = n;

  const { data: currentRot } = await supabaseClient
    .from("seats")
    .select("*")
    .eq("type","rotating");

  if (currentRot && currentRot.length > 0) {
    const ids = currentRot.map(r => r.id);
    await supabaseClient.from("seats").delete().in("id", ids);
  }

  for (let i=1; i<=n; i++) {
    await supabaseClient.from("seats").insert({ number: `Rot ${i}`, type: "rotating" });
  }

  await loadSeats();
}

// ============================
// Agregar persona
// ============================
async function addPerson() {
  const name = document.getElementById("personName").value.trim();
  const type = document.getElementById("seatType").value;
  if (!name) return alert("Escribe un nombre");

  const { data: member, error } = await supabaseClient
    .from("members")
    .insert([{ name }])
    .select()
    .single();
  if (error) return alert(error.message);

  if (type === "fixed") {
    const seatNum = document.getElementById("fixedSelect").value;
    if (!seatNum) return alert("Selecciona asiento fijo");

    const { data: seat } = await supabaseClient
      .from("seats")
      .select("*")
      .eq("number", seatNum)
      .eq("type","fixed")
      .maybeSingle();

    if (seat?.assigned_member_id) {
      return alert("Asiento fijo ya ocupado");
    }

    if (seat) {
      await supabaseClient.from("seats")
        .update({ assigned_member_id: member.id })
        .eq("id", seat.id);
    } else {
      await supabaseClient.from("seats")
        .insert([{ number: seatNum, type: "fixed", assigned_member_id: member.id }])
        .select()
        .single();
    }

  } else if (type === "rotating") {
    let { data: libres } = await supabaseClient
      .from("seats")
      .select("*")
      .eq("type","rotating")
      .is("assigned_member_id", null)
      .order("number");

    if (!libres || libres.length === 0) {
      return alert("No hay asientos rotativos libres, aumenta la cantidad.");
    }

    const chosen = libres[0];
    await supabaseClient.from("seats")
      .update({ assigned_member_id: member.id })
      .eq("id", chosen.id);
  }

  document.getElementById("personName").value = "";
  await loadSeats();
}

// ============================
// Rotar asientos (solo ocupados, manteniendo vacíos)
// ============================
async function rotateSeats() {
  const { data: seats } = await supabaseClient
    .from("seats")
    .select("*")
    .eq("type","rotating")
    .order("number");

  if (!seats || seats.length === 0) return alert("No hay asientos rotativos configurados");

  const assigned = seats.filter(s => s.assigned_member_id).map(s => s.assigned_member_id);
  if (assigned.length <= 1) return alert("No hay suficientes personas para rotar");

  function derangement(arr) {
    if (arr.length < 2) return arr;
    let result;
    do {
      result = [...arr].sort(()=>Math.random()-0.5);
    } while (result.some((v,i)=>v===arr[i]));
    return result;
  }

  const rotated = derangement(assigned);

  // limpiar solo los ocupados
  for (const s of seats) {
    if (s.assigned_member_id) {
      await supabaseClient.from("seats").update({ assigned_member_id: null }).eq("id", s.id);
    }
  }

  // reasignar a otros asientos
  for (let i=0; i<rotated.length; i++) {
    const seat = seats[i];
    if (!seat) continue;
    await supabaseClient.from("seats")
      .update({ assigned_member_id: rotated[i] })
      .eq("id", seat.id);
  }

  await loadSeats();
}

// ============================
// Editar / liberar / borrar
// ============================
async function editMember(memberId) {
  const newName = prompt("Nuevo nombre:");
  if (!newName) return;

  await supabaseClient.from("members")
    .update({ name: newName })
    .eq("id", memberId);

  await loadSeats();
}

async function clearSeat(seatId) {
  await supabaseClient.from("seats").update({ assigned_member_id: null }).eq("id", seatId);
  await loadSeats();
}

async function deleteMember(memberId) {
  if (confirm("¿Estás seguro de que quieres eliminar a esta persona? Se borrará de forma permanente de todos los asientos.")) {
    // Primero, liberar todos los asientos asignados a este miembro
    await supabaseClient
        .from("seats")
        .update({ assigned_member_id: null })
        .eq("assigned_member_id", memberId);

    // Luego, eliminar al miembro de la base de datos
    await supabaseClient.from("members").delete().eq("id", memberId);
    
    await loadSeats();
  }
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

  seats.forEach(seat=>{
    const div = document.createElement("div");
    div.className = `seat ${seat.type}`;

    const name = seat.members?.name || "Vacío";
    const statusClass = seat.members?.name ? "person" : "empty";
    
    let actions = "";
    if (seat.members?.id) {
      actions = `
        <button class="btn small" onclick="editMember('${seat.members.id}')">✏️</button>
        <button class="btn small" onclick="clearSeat('${seat.id}')">♻️</button>
        <button class="btn small danger" onclick="deleteMember('${seat.members.id}')">🗑️</button>
      `;
    }

    div.innerHTML = `
      <div class="seat-title">${seat.number}</div>
      <div class="${statusClass}">${name}</div>
      <div class="actions">${actions}</div>
    `;

    if (seat.type==="fixed") fixedDiv.appendChild(div);
    else rotDiv.appendChild(div);
  });

  updateFixedOptions(seats);
}

function updateFixedOptions(seats=[]) {
  const div = document.getElementById("fixedOptions");
  div.innerHTML = "";
  const sel = document.createElement("select");
  sel.id = "fixedSelect";
  
  const fixedSeats = seats.filter(s => s.type === 'fixed' && !s.assigned_member_id);
  
  if (fixedSeats.length === 0) {
    sel.innerHTML = '<option value="">No hay puestos fijos libres</option>';
  } else {
    sel.innerHTML = '<option value="">Selecciona un asiento fijo libre</option>';
    fixedSeats.forEach(seat => {
      sel.innerHTML += `<option value="${seat.number}">${seat.number}</option>`;
    });
  }

  div.appendChild(sel);
}