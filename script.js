// ============================
// Conexión a Supabase
// ============================
const SUPABASE_URL = "https://odtmssqqrpbkyoqrpcqe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdG1zc3FxcnBia3lvcXJwY3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTUyNDcsImV4cCI6MjA3MjMzMTI0N30.ikWopqnMIatL1Q2fRcit_lPFwh1JH2ZyHoAukZ_ewyk";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Datos de asientos fijos
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

document.addEventListener("DOMContentLoaded", async () => {
  await initializeFixedSeats();
  await loadSeats();
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
// Agregar persona con equipo
// ============================
async function addPerson() {
  const name = document.getElementById("personName").value.trim();
  const team = document.getElementById("teamName").value.trim() || null;
  const type = document.getElementById("seatType").value;
  if (!name) return alert("Escribe un nombre");

  let seatNum;
  if (type === "fixed") {
    seatNum = document.getElementById("fixedInput").value.trim();
    if (!seatNum) return alert("Escribe un número de asiento fijo válido");
  }

  const { data: member, error: memberError } = await supabaseClient
    .from("members")
    .insert([{ name, team }])
    .select()
    .single();
  if (memberError) {
    console.error('Error al insertar miembro:', memberError);
    return alert(memberError.message);
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
    // 1. Buscar un asiento rotativo vacío existente
    const { data: availableSeat } = await supabaseClient
      .from("seats")
      .select("*")
      .eq("type", "rotating")
      .is("assigned_member_id", null)
      .order("number")
      .limit(1)
      .maybeSingle();

    let chosenSeat;

    if (availableSeat) {
      chosenSeat = availableSeat;
    } else {
      // 2. Si no hay asientos vacíos, crear uno nuevo con un número único
      const { data: lastRotativo } = await supabaseClient
        .from("seats")
        .select("number")
        .eq("type", "rotating")
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();

      let newOffice = 701;
      let newSeatNumber = 16; // Los asientos fijos en 701 terminan en 15

      if (lastRotativo) {
        const lastParts = lastRotativo.number.split('-');
        if (lastParts.length === 3) {
          newOffice = parseInt(lastParts[1]);
          newSeatNumber = parseInt(lastParts[2]) + 1;
        }
      }
      
      const { data: newSeat } = await supabaseClient
        .from("seats")
        .insert([{ number: `R-${newOffice}-${newSeatNumber}`, type: "rotating" }])
        .select()
        .single();
      chosenSeat = newSeat;
    }

    // Asignar el miembro al asiento
    await supabaseClient.from("seats")
      .update({ assigned_member_id: member.id })
      .eq("id", chosenSeat.id);
  }

  document.getElementById("personName").value = "";
  document.getElementById("teamName").value = "";
  if (type === "fixed") {
    document.getElementById("fixedInput").value = "";
  }
  await loadSeats();
}

// ============================
// Rotar asientos por equipo
// ============================
async function rotateSeats() {
  const { data: membersToRotate } = await supabaseClient
    .from("members")
    .select("id, name, team");

  if (!membersToRotate || membersToRotate.length <= 1) {
    return alert("No hay suficientes personas para rotar.");
  }

  const { data: allRotatingSeats } = await supabaseClient
    .from("seats")
    .select("*")
    .eq("type", "rotating");

  // Limpiar todos los asientos rotativos
  await supabaseClient.from("seats")
    .update({ assigned_member_id: null })
    .eq("type", "rotating");

  // Mezclar los miembros para una rotación aleatoria
  const shuffledMembers = membersToRotate.sort(() => Math.random() - 0.5);

  const assignments = [];
  const teamAssignments = {};

  // Intentar asignar a personas del mismo equipo en asientos contiguos
  for (const member of shuffledMembers) {
    if (member.team) {
      if (!teamAssignments[member.team]) {
        teamAssignments[member.team] = [];
      }
      teamAssignments[member.team].push(member);
    } else {
      assignments.push(member);
    }
  }

  let seatIndex = 0;
  for (const team in teamAssignments) {
    for (const member of teamAssignments[team]) {
      if (seatIndex < allRotatingSeats.length) {
        const seat = allRotatingSeats[seatIndex];
        await supabaseClient
          .from("seats")
          .update({ assigned_member_id: member.id })
          .eq("id", seat.id);
        seatIndex++;
      } else {
        break;
      }
    }
  }

  for (const member of assignments) {
    if (seatIndex < allRotatingSeats.length) {
      const seat = allRotatingSeats[seatIndex];
      await supabaseClient
        .from("seats")
        .update({ assigned_member_id: member.id })
        .eq("id", seat.id);
      seatIndex++;
    } else {
      break;
    }
  }

  await loadSeats();
  alert("Asientos rotados exitosamente.");
}

// ============================
// Editar / liberar / borrar
// ============================

async function editSeat(seatId) {
  const { data: seatData } = await supabaseClient
    .from('seats')
    .select('assigned_member_id')
    .eq('id', seatId)
    .single();

  const memberId = seatData?.assigned_member_id;

  if (!memberId) {
    return alert('Este asiento está vacío y no se puede editar.');
  }

  const newName = prompt("Nuevo nombre de persona:");
  if (!newName || newName.trim() === '') return;

  await supabaseClient
    .from('members')
    .update({ name: newName.trim() })
    .eq('id', memberId);

  await loadSeats();
}

async function clearSeat(seatId) {
  const { data: seat } = await supabaseClient
    .from("seats")
    .select("*, members:assigned_member_id (id)")
    .eq("id", seatId)
    .single();

  if (!seat) return;

  if (seat.type === "fixed") {
    await supabaseClient
      .from("seats")
      .update({ assigned_member_id: null })
      .eq("id", seatId);

    const { data: otherFixedSeats } = await supabaseClient
      .from('seats')
      .select('*')
      .eq('assigned_member_id', seat.assigned_member_id)
      .neq('id', seatId);

    if (!otherFixedSeats || otherFixedSeats.length === 0) {
      await supabaseClient
        .from('members')
        .delete()
        .eq('id', seat.assigned_member_id);
    }
  }
  else if (seat.type === "rotating") {
    if (seat.assigned_member_id) {
      await supabaseClient.from("members").delete().eq("id", seat.assigned_member_id);
    }
    await supabaseClient.from("seats").delete().eq("id", seatId);
  }

  await loadSeats();
}

async function clearAllSeats() {
  await supabaseClient.from("seats").update({ assigned_member_id: null }).neq("id", -1);
  await supabaseClient.from("members").delete().not("id", "eq", ""); 
  await supabaseClient.from("seats").delete().neq("type", "fixed");
  await loadSeats();
}

// ============================
// Render
// ============================
async function loadSeats() {
  const { data: seats } = await supabaseClient
    .from("seats")
    .select("*, members:assigned_member_id (id,name,team)")
    .order("type")
    .order("number");

  const fixedDiv = document.getElementById("fixedSeats");
  const rotDiv = document.getElementById("rotatingSeats");
  fixedDiv.innerHTML = "";
  rotDiv.innerHTML = "";

  if (!seats) {
    console.error("No se pudieron cargar los asientos desde Supabase.");
    return;
  }

  seats.forEach(seat => {
    const div = document.createElement("div");
    div.className = `seat ${seat.type}`;

    const editBtn = seat.assigned_member_id ? `<button class="btn small" onclick="editSeat('${seat.id}')">✏️</button>` : '';
    const clearBtn = seat.assigned_member_id ? `<button class="btn small danger" onclick="clearSeat('${seat.id}')">🗑️</button>` : `<button class="btn small danger" onclick="clearSeat('${seat.id}')">♻️</button>`;

    const team = seat.members?.team ? `<br><span>(${seat.members.team})</span>` : '';
    const nameDisplay = seat.members?.name ? `<span class="person">${seat.members.name}</span>${team}` : `<span class="empty">Vacío</span>`;
    
    // Aquí está la lógica de renderizado ajustada para asientos fijos y rotativos
    const seatTitle = seat.type === "fixed" ? `Fijo ${seat.number}` : `Rotativo ${seat.number.substring(2)}`;

    div.innerHTML = `
      <div class="seat-title">${seatTitle}</div>
      <div>${nameDisplay}</div>
      <div class="actions">
        ${editBtn}
        ${clearBtn}
      </div>
    `;

    if (seat.type === "fixed") fixedDiv.appendChild(div);
    else rotDiv.appendChild(div);
  });
}

function updateFixedOptions(seats=[]) {
  const div = document.getElementById("fixedOptions");
  div.innerHTML = "";
  const sel = document.createElement("select");
  sel.id = "fixedSelect";
  for (let i=1;i<=10;i++){
    sel.innerHTML += `<option value="${i}">Asiento ${i}</option>`;
    supabaseClient.from("seats").upsert({ number: i, type: "fixed" }, {onConflict: ["number","type"]});
  }
  div.appendChild(sel);
}