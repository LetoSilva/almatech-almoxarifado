/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const NCM_URL =
    "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json";

const DB_KEYS = {
    users:"almatech_users",
    materials:"almatech_materials",
    movements:"almatech_movements",
    ncm:"almatech_ncm",
    current:"almatech_current_user"
};


/* =========================================================
   ESTADO
========================================================= */

let users = [];
let materials = [];
let movements = [];
let ncmDatabase = {};
let currentUser = null;


/* =========================================================
   UTILIDADES
========================================================= */

function loadData(){

    /* =====================================================
       USUÁRIOS
    ===================================================== */

    const savedUsers =
        localStorage.getItem(DB_KEYS.users);

    if(savedUsers){

        try{

            users = JSON.parse(savedUsers);

        }catch(error){

            console.error(
                "Erro ao carregar usuários:",
                error
            );

            users = [];

        }

    }else{

        /*
            Cria os usuários padrão somente na primeira execução.
        */

        users = [

            {
                id:crypto.randomUUID(),
                name:"Administrador",
                username:"admin",
                password:"admin123",
                role:"ADMIN",
                active:true,
                createdAt:new Date().toISOString()
            },

            {
                id:crypto.randomUUID(),
                name:"Almoxarife",
                username:"almox",
                password:"123456",
                role:"USER",
                active:true,
                createdAt:new Date().toISOString()
            }

        ];

        /*
            Salva imediatamente.

            Isso é importante porque os IDs gerados
            precisam permanecer os mesmos depois de um F5.
        */

        localStorage.setItem(
            DB_KEYS.users,
            JSON.stringify(users)
        );

    }


    /* =====================================================
       MATERIAIS
    ===================================================== */

    try{

        materials =
            JSON.parse(
                localStorage.getItem(DB_KEYS.materials) || "[]"
            );

    }catch(error){

        console.error(
            "Erro ao carregar materiais:",
            error
        );

        materials = [];

    }


    /* =====================================================
       MOVIMENTAÇÕES
    ===================================================== */

    try{

        movements =
            JSON.parse(
                localStorage.getItem(DB_KEYS.movements) || "[]"
            );

    }catch(error){

        console.error(
            "Erro ao carregar movimentações:",
            error
        );

        movements = [];

    }


    /* =====================================================
       BASE NCM
    ===================================================== */

    try{

        ncmDatabase =
            JSON.parse(
                localStorage.getItem(DB_KEYS.ncm) || "{}"
            );

    }catch(error){

        console.error(
            "Erro ao carregar base NCM:",
            error
        );

        ncmDatabase = {};

    }


    /*
        NÃO carregamos currentUser aqui.

        A sessão será restaurada pela função
        restoreSession().
    */

    currentUser = null;

}


function saveData(){

    localStorage.setItem(DB_KEYS.users,JSON.stringify(users));
    localStorage.setItem(DB_KEYS.materials,JSON.stringify(materials));
    localStorage.setItem(DB_KEYS.movements,JSON.stringify(movements));
    localStorage.setItem(DB_KEYS.ncm,JSON.stringify(ncmDatabase));

}


function money(value){

    return Number(value || 0).toLocaleString("pt-BR",{
        style:"currency",
        currency:"BRL"
    });

}


function dateTime(value){

    return new Date(value).toLocaleString("pt-BR");

}


function escapeHTML(value){

    return String(value ?? "")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");

}


function toast(message,type="success"){

    const box = document.getElementById("toast");

    const item = document.createElement("div");

    item.className = "toast " + type;

    item.textContent = message;

    box.appendChild(item);

    setTimeout(()=>{
        item.remove();
    },3500);

}


/* =========================================================
   LOGIN
========================================================= */

/* =========================================================
   LOGIN / SESSÃO
========================================================= */

function login(){

    const username =
        document.getElementById("loginUser")
        .value
        .trim();

    const password =
        document.getElementById("loginPass")
        .value;


    if(!username || !password){

        toast(
            "Informe usuário e senha.",
            "error"
        );

        return;

    }


    const user =
        users.find(
            u =>
                u.username.toLowerCase() ===
                username.toLowerCase() &&

                u.password === password &&

                u.active === true
        );


    if(!user){

        toast(
            "Usuário ou senha inválidos.",
            "error"
        );

        return;

    }


    /*
        Define o usuário atual.
    */

    currentUser = user;


    /*
        IMPORTANTE:

        Salvamos somente o ID do usuário.

        Não salvamos mais o objeto inteiro.
    */

    localStorage.setItem(
        DB_KEYS.current,
        user.id
    );


    /*
        Abre o sistema.
    */

    startApplication();

}


/* =========================================================
   RESTAURAR SESSÃO APÓS F5 / REFRESH
========================================================= */

function restoreSession(){

    let savedUserId =
        localStorage.getItem(DB_KEYS.current);


    /*
        Não existe sessão salva.
    */

    if(!savedUserId){

        return false;

    }


    /*
        COMPATIBILIDADE COM A VERSÃO ANTIGA

        Se o navegador ainda tiver salvo o objeto inteiro
        da versão anterior, convertemos automaticamente
        para o ID.

        Isso evita que o usuário precise limpar o navegador.
    */

    try{

        const parsed =
            JSON.parse(savedUserId);

        if(
            parsed &&
            typeof parsed === "object" &&
            parsed.id
        ){

            savedUserId = String(parsed.id);

            localStorage.setItem(
                DB_KEYS.current,
                savedUserId
            );

        }

    }catch(error){

        /*
            Não é JSON.
            Isso significa que provavelmente já é
            o ID salvo pela nova versão.
        */

    }


    /*
        Procura o usuário novamente nos dados carregados.
    */

    const user =
        users.find(
            u =>
                String(u.id) === String(savedUserId) &&
                u.active === true
        );


    /*
        Se o usuário não existir mais ou estiver bloqueado,
        remove a sessão.
    */

    if(!user){

        console.warn(
            "Sessão encontrada, mas o usuário não está mais disponível."
        );

        localStorage.removeItem(
            DB_KEYS.current
        );

        currentUser = null;

        return false;

    }


    /*
        Usuário encontrado.

        Restaura a sessão automaticamente.
    */

    currentUser = user;


    startApplication();


    return true;

}


/* =========================================================
   LOGOUT
========================================================= */

function logout(){

    /*
        Encerra somente a sessão.
        Os dados de materiais, usuários e movimentações
        continuam salvos.
    */

    currentUser = null;

    localStorage.removeItem(
        DB_KEYS.current
    );


    /*
        Esconde o sistema.
    */

    document.getElementById("app")
        .classList.add("hidden");


    /*
        Mostra o login.
    */

    document.getElementById("loginScreen")
        .classList.remove("hidden");


    /*
        Limpa os campos.
    */

    document.getElementById("loginUser")
        .value = "";

    document.getElementById("loginPass")
        .value = "";

}


function startApplication(){

    document.getElementById("loginScreen")
        .classList.add("hidden");

    document.getElementById("app")
        .classList.remove("hidden");

    document.getElementById("sideUser")
        .textContent = currentUser.name;

    document.getElementById("sideRole")
        .textContent =
        currentUser.role === "ADMIN"
        ? "ADMINISTRADOR"
        : "USUÁRIO AUTORIZADO";

    document.getElementById("userAvatar")
        .textContent =
        currentUser.name.charAt(0).toUpperCase();

    document.querySelectorAll(".admin-only")
        .forEach(el=>{
            el.style.display =
                currentUser.role === "ADMIN"
                ? ""
                : "none";
        });

    updateDate();

    renderAll();

}


function updateDate(){

    document.getElementById("currentDate")
        .textContent =
        new Date().toLocaleDateString(
            "pt-BR",
            {
                weekday:"long",
                year:"numeric",
                month:"long",
                day:"numeric"
            }
        );

}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function showPage(page,button=null){

    if(
        (page === "users" || page === "settings") &&
        currentUser?.role !== "ADMIN"
    ){

        toast("Acesso restrito ao administrador.","error");

        return;

    }

    document.querySelectorAll(".page")
        .forEach(p=>p.classList.remove("active"));

    const target =
        document.getElementById("page-"+page);

    if(!target)return;

    target.classList.add("active");

    document.querySelectorAll(".nav-btn")
        .forEach(btn=>btn.classList.remove("active"));

    if(button){

        button.classList.add("active");

    }else{

        const nav =
            document.querySelector(
                `.nav-btn[data-page="${page}"]`
            );

        if(nav)nav.classList.add("active");

    }

    const titles = {
        dashboard:"Dashboard",
        materials:"Materiais",
        movement:"Entrada / Saída",
        history:"Histórico",
        users:"Usuários",
        settings:"Configurações"
    };

    document.getElementById("pageTitle")
        .textContent = titles[page] || page;

    if(page==="dashboard")renderDashboard();

    if(page==="materials")renderMaterials();

    if(page==="movement")renderMovementSelect();

    if(page==="history")renderHistory();

    if(page==="users")renderUsers();

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard(){

    document.getElementById("cardItems")
        .textContent = materials.length;

    const totalValue =
        materials.reduce(
            (sum,m)=>sum + Number(m.qty)*Number(m.value),
            0
        );

    document.getElementById("cardValue")
        .textContent = money(totalValue);

    document.getElementById("cardIn")
        .textContent =
        movements.filter(m=>m.type==="ENTRADA").length;

    document.getElementById("cardOut")
        .textContent =
        movements.filter(m=>m.type==="SAIDA").length;

    document.getElementById("lowStock")
        .textContent =
        materials.filter(
            m=>Number(m.qty)<=Number(m.min)
        ).length;

    document.getElementById("activeUsers")
        .textContent =
        users.filter(u=>u.active).length;


    const recent =
        [...movements]
        .sort(
            (a,b)=>
                new Date(b.date)-new Date(a.date)
        )
        .slice(0,8);


    document.getElementById("recentMovements")
        .innerHTML =
        recent.length
        ? recent.map(m=>{

            return `
            <tr>
                <td>${dateTime(m.date)}</td>
                <td>${escapeHTML(m.materialName)}</td>
                <td>
                    <span class="badge ${
                        m.type==="ENTRADA"
                        ? "badge-green"
                        : "badge-red"
                    }">
                        ${m.type}
                    </span>
                </td>
                <td>${m.qty}</td>
                <td>${escapeHTML(m.userName)}</td>
            </tr>`;

        }).join("")
        : `
            <tr>
                <td colspan="5" style="text-align:center;color:var(--muted)">
                    Nenhuma movimentação registrada.
                </td>
            </tr>
        `;

}


/* =========================================================
   MATERIAIS
========================================================= */

function openMaterialModal(){

    document.getElementById("mCode").value =
        "MAT-" +
        String(materials.length+1).padStart(4,"0");

    document.getElementById("mName").value="";
    document.getElementById("mDescription").value="";
    document.getElementById("mNcm").value="";
    document.getElementById("mQty").value="0";
    document.getElementById("mMin").value="0";
    document.getElementById("mValue").value="0";

    document.getElementById("ncmStatus").textContent="";

    updateMaterialTotal();

    document.getElementById("materialModal")
        .classList.add("open");

}


function saveMaterial(){

    const code =
        document.getElementById("mCode").value.trim();

    const name =
        document.getElementById("mName").value.trim();

    const description =
        document.getElementById("mDescription").value.trim();

    const ncm =
        document.getElementById("mNcm").value.trim();

    const unit =
        document.getElementById("mUnit").value;

    const qty =
        Number(document.getElementById("mQty").value);

    const min =
        Number(document.getElementById("mMin").value);

    const value =
        Number(document.getElementById("mValue").value);


    if(!code || !name || !description || !ncm){

        toast("Preencha todos os campos obrigatórios.","error");

        return;

    }


    if(!/^\d{8}$/.test(ncm)){

        toast("O NCM deve possuir exatamente 8 dígitos.","error");

        return;

    }


    if(
        Object.keys(ncmDatabase).length &&
        !ncmDatabase[ncm]
    ){

        toast(
            "NCM não encontrado na base carregada. Cadastro bloqueado.",
            "error"
        );

        return;

    }


    if(
        materials.some(
            m=>m.code.toLowerCase()===code.toLowerCase()
        )
    ){

        toast("Já existe um material com esse código.","error");

        return;

    }


    const material = {

        id:crypto.randomUUID(),

        code,
        name,
        description,
        ncm,
        ncmDescription:ncmDatabase[ncm] || "",

        unit,

        qty,
        min,
        value,

        active:true,

        createdAt:new Date().toISOString(),

        createdBy:currentUser.username

    };


    materials.push(material);

    saveData();

    closeModal("materialModal");

    renderMaterials();

    renderDashboard();

    renderMovementSelect();

    toast("Material cadastrado com sucesso.");

}


/* =========================================================
   NCM
========================================================= */

async function validateNCMInput(){

    const input =
        document.getElementById("mNcm");

    const status =
        document.getElementById("ncmStatus");

    let value =
        input.value.replace(/\D/g,"");

    input.value=value;

    if(value.length===0){

        status.textContent="";

        return;

    }

    if(value.length<8){

        status.className="ncm-status ncm-loading";

        status.textContent =
            `${value.length}/8 dígitos`;

        return;

    }


    if(value.length===8){

        if(Object.keys(ncmDatabase).length===0){

            status.className="ncm-status ncm-loading";

            status.textContent =
                "Base NCM não carregada. Clique em atualizar.";

            return;

        }


        if(ncmDatabase[value]){

            status.className="ncm-status ncm-ok";

            status.textContent =
                "✓ NCM válido — " +
                ncmDatabase[value];

        }else{

            status.className="ncm-status ncm-error";

            status.textContent =
                "✕ NCM não encontrado na tabela vigente.";

        }

    }

}


async function loadNCMDatabase(showMessage=false){

    const status =
        document.getElementById("ncmInfo");

    if(status){

        status.textContent =
            "Consultando tabela NCM vigente...";

    }

    try{

        const response =
            await fetch(NCM_URL,{
                cache:"no-store"
            });

        if(!response.ok){

            throw new Error(
                "HTTP "+response.status
            );

        }

        const data =
            await response.json();

        const parsed =
            parseNCMData(data);

        if(!Object.keys(parsed).length){

            throw new Error(
                "Formato de tabela não reconhecido."
            );

        }

        ncmDatabase=parsed;

        localStorage.setItem(
            DB_KEYS.ncm,
            JSON.stringify(ncmDatabase)
        );

        if(status){

            status.textContent =
                `${Object.keys(ncmDatabase).length.toLocaleString("pt-BR")} códigos NCM carregados.`;

        }

        if(showMessage){

            toast(
                `Base NCM atualizada: ${Object.keys(ncmDatabase).length} códigos.`
            );

        }

    }catch(error){

        console.error(error);

        if(status){

            status.textContent =
                "Não foi possível carregar a tabela NCM automaticamente. " +
                "Verifique sua conexão ou CORS.";

        }

        if(showMessage){

            toast(
                "Falha ao atualizar a base NCM.",
                "error"
            );

        }

    }

}


/*
    A Receita/Siscomex pode alterar a estrutura do JSON.
    Esta função tenta reconhecer os formatos mais comuns.
*/

function parseNCMData(data){

    const result={};


    function visit(value){

        if(Array.isArray(value)){

            value.forEach(visit);

            return;

        }


        if(!value || typeof value!=="object"){

            return;

        }


        const code =
            value.codigo ||
            value.code ||
            value.ncm ||
            value.NCM ||
            value.CodigoNcm;


        const description =
            value.descricao ||
            value.description ||
            value.Descricao ||
            value.descricaoNcm;


        if(
            code &&
            description &&
            /^\d{8}$/.test(
                String(code).replace(/\D/g,"")
            )
        ){

            const clean =
                String(code).replace(/\D/g,"");

            result[clean]=String(description);

        }


        Object.values(value).forEach(visit);

    }


    visit(data);

    return result;

}


/* =========================================================
   TABELA DE MATERIAIS
========================================================= */

function renderMaterials(){

    const tbody =
        document.getElementById("materialsTable");

    if(!tbody)return;

    const search =
        (
            document.getElementById("materialSearch")?.value
            || ""
        ).toLowerCase();


    const list =
        materials.filter(m=>{

            return (
                m.code.toLowerCase().includes(search) ||
                m.name.toLowerCase().includes(search) ||
                m.ncm.includes(search)
            );

        });


    tbody.innerHTML =
        list.length
        ? list.map(m=>{

            const low =
                Number(m.qty)<=Number(m.min);

            return `
            <tr>

                <td>
                    <strong>${escapeHTML(m.code)}</strong>
                </td>

                <td>
                    <strong>${escapeHTML(m.name)}</strong>
                    <div style="font-size:10px;color:var(--muted);margin-top:3px">
                        ${escapeHTML(m.description)}
                    </div>
                </td>

                <td>${m.ncm}</td>

                <td>${m.unit}</td>

                <td>
                    ${m.qty}
                </td>

                <td>
                    ${m.min}
                </td>

                <td>
                    ${money(m.value)}
                </td>

                <td>
                    <span class="badge ${
                        low
                        ? "badge-yellow"
                        : "badge-green"
                    }">
                        ${low ? "ESTOQUE BAIXO":"NORMAL"}
                    </span>
                </td>

                <td>
                    <button
                        class="btn"
                        onclick="deleteMaterial('${m.id}')">
                        Excluir
                    </button>
                </td>

            </tr>`;

        }).join("")
        : `
            <tr>
                <td colspan="9"
                    style="text-align:center;color:var(--muted);padding:30px">
                    Nenhum material encontrado.
                </td>
            </tr>
        `;

}


function deleteMaterial(id){

    const material =
        materials.find(m=>m.id===id);

    if(!material)return;


    if(
        !confirm(
            `Excluir o material "${material.name}"?`
        )
    )return;


    materials =
        materials.filter(m=>m.id!==id);

    saveData();

    renderMaterials();
    renderDashboard();
    renderMovementSelect();

    toast("Material excluído.");

}


/* =========================================================
   MOVIMENTAÇÃO
========================================================= */

function renderMovementSelect(){

    const select =
        document.getElementById("movementMaterial");

    if(!select)return;


    select.innerHTML =
        `<option value="">Selecione um material...</option>` +
        materials
        .filter(m=>m.active)
        .map(m=>
            `<option value="${m.id}">
                ${escapeHTML(m.code)} — ${escapeHTML(m.name)}
                — saldo: ${m.qty} ${m.unit}
            </option>`
        )
        .join("");


    select.onchange=()=>{

        const material =
            materials.find(
                m=>m.id===select.value
            );

        if(material){

            document.getElementById("movementValue")
                .value=material.value;

        }

    };

}


function registerMovement(){

    const type =
        document.getElementById("movementType").value;

    const materialId =
        document.getElementById("movementMaterial").value;

    const qty =
        Number(document.getElementById("movementQty").value);

    const doc =
        document.getElementById("movementDoc").value.trim();

    const value =
        Number(document.getElementById("movementValue").value);

    const note =
        document.getElementById("movementNote").value.trim();


    if(!materialId){

        toast("Selecione um material.","error");

        return;

    }

    if(!qty || qty<=0){

        toast("Informe uma quantidade válida.","error");

        return;

    }


    const material =
        materials.find(
            m=>m.id===materialId
        );


    if(!material){

        toast("Material não encontrado.","error");

        return;

    }


    const previous =
        Number(material.qty);


    if(
        type==="SAIDA" &&
        qty>previous
    ){

        toast(
            `Saldo insuficiente. Disponível: ${previous} ${material.unit}.`,
            "error"
        );

        return;

    }


    const newQty =
        type==="ENTRADA"
        ? previous+qty
        : previous-qty;


    material.qty=newQty;


    const movement={

        id:crypto.randomUUID(),

        date:new Date().toISOString(),

        materialId:material.id,

        materialCode:material.code,

        materialName:material.name,

        ncm:material.ncm,

        type,

        qty,

        value,

        total:qty*value,

        previousQty:previous,

        finalQty:newQty,

        document:doc,

        note,

        userId:currentUser.id,

        userName:currentUser.name

    };


    movements.push(movement);

    saveData();


    document.getElementById("movementQty").value="";
    document.getElementById("movementDoc").value="";
    document.getElementById("movementNote").value="";


    renderDashboard();
    renderMovementSelect();

    toast(
        type==="ENTRADA"
        ? "Entrada registrada com sucesso."
        : "Saída registrada com sucesso."
    );

}


/* =========================================================
   HISTÓRICO
========================================================= */

function renderHistory(){

    const tbody =
        document.getElementById("historyTable");

    if(!tbody)return;


    const search =
        (
            document.getElementById("historySearch")?.value
            || ""
        ).toLowerCase();

    const filter =
        document.getElementById("historyFilter")?.value
        || "";


    const list =
        [...movements]
        .sort(
            (a,b)=>
                new Date(b.date)-new Date(a.date)
        )
        .filter(m=>{

            const text =
                (
                    m.materialName+
                    " "+
                    m.materialCode+
                    " "+
                    m.ncm+
                    " "+
                    m.userName+
                    " "+
                    m.document
                ).toLowerCase();

            return (
                (!search || text.includes(search)) &&
                (!filter || m.type===filter)
            );

        });


    tbody.innerHTML =
        list.length
        ? list.map(m=>`

            <tr>

                <td>${dateTime(m.date)}</td>

                <td>
                    <strong>${escapeHTML(m.materialCode)}</strong><br>
                    <span style="font-size:10px;color:var(--muted)">
                        ${escapeHTML(m.materialName)}
                    </span>
                </td>

                <td>${m.ncm}</td>

                <td>
                    <span class="badge ${
                        m.type==="ENTRADA"
                        ? "badge-green"
                        : "badge-red"
                    }">
                        ${m.type}
                    </span>
                </td>

                <td>${m.qty}</td>

                <td>${m.previousQty}</td>

                <td>${m.finalQty}</td>

                <td>${escapeHTML(m.userName)}</td>

                <td>${escapeHTML(m.document || "-")}</td>

            </tr>

        `).join("")
        : `
            <tr>
                <td colspan="9"
                    style="text-align:center;color:var(--muted);padding:30px">
                    Nenhuma movimentação encontrada.
                </td>
            </tr>
        `;

}


/* =========================================================
   USUÁRIOS
========================================================= */

function openUserModal(){

    document.getElementById("uName").value="";
    document.getElementById("uUser").value="";
    document.getElementById("uPass").value="";
    document.getElementById("uRole").value="USER";

    document.getElementById("userModal")
        .classList.add("open");

}


function saveUser(){

    const name =
        document.getElementById("uName").value.trim();

    const username =
        document.getElementById("uUser").value.trim();

    const password =
        document.getElementById("uPass").value;

    const role =
        document.getElementById("uRole").value;


    if(!name || !username || !password){

        toast(
            "Preencha nome, usuário e senha.",
            "error"
        );

        return;

    }


    if(
        users.some(
            u=>u.username.toLowerCase()===username.toLowerCase()
        )
    ){

        toast("Esse usuário já existe.","error");

        return;

    }


    users.push({

        id:crypto.randomUUID(),

        name,
        username,
        password,

        role,

        active:true,

        createdAt:new Date().toISOString()

    });


    saveData();

    closeModal("userModal");

    renderUsers();

    renderDashboard();

    toast("Usuário criado com sucesso.");

}


function renderUsers(){

    const tbody =
        document.getElementById("usersTable");

    if(!tbody)return;


    tbody.innerHTML =
        users.map(u=>`

        <tr>

            <td>
                <strong>${escapeHTML(u.username)}</strong>
            </td>

            <td>${escapeHTML(u.name)}</td>

            <td>
                <span class="badge ${
                    u.role==="ADMIN"
                    ? "badge-blue"
                    : "badge-green"
                }">
                    ${
                        u.role==="ADMIN"
                        ? "ADMINISTRADOR"
                        : "USUÁRIO"
                    }
                </span>
            </td>

            <td>
                <span class="badge ${
                    u.active
                    ? "badge-green"
                    : "badge-red"
                }">
                    ${u.active ? "ATIVO":"BLOQUEADO"}
                </span>
            </td>

            <td>${dateTime(u.createdAt)}</td>

            <td>

                ${
                    u.username!=="admin"
                    ?
                    `<button
                        class="btn ${u.active ? "btn-danger":"btn-success"}"
                        onclick="toggleUser('${u.id}')">
                        ${u.active ? "Bloquear":"Ativar"}
                    </button>`
                    :
                    `<span style="color:var(--muted);font-size:10px">
                        PRINCIPAL
                    </span>`
                }

            </td>

        </tr>

    `).join("");

}


function toggleUser(id){

    const user =
        users.find(u=>u.id===id);

    if(!user)return;

    user.active=!user.active;

    saveData();

    renderUsers();

    renderDashboard();

    toast(
        user.active
        ? "Usuário ativado."
        : "Usuário bloqueado."
    );

}


/* =========================================================
   EXPORTAÇÃO
========================================================= */

function downloadFile(content,name,type){

    const blob =
        new Blob(
            [content],
            {type}
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href=url;
    a.download=name;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

}


function exportData(){

    const backup={

        application:"ALMATECH",

        version:"1.0",

        exportedAt:new Date().toISOString(),

        users,

        materials,

        movements,

        ncmDatabase

    };


    downloadFile(

        JSON.stringify(backup,null,2),

        `almatech-backup-${Date.now()}.json`,

        "application/json"

    );

    toast("Backup exportado.");

}


function exportHistory(){

    const header=[
        "Data",
        "Material",
        "NCM",
        "Tipo",
        "Quantidade",
        "Saldo Anterior",
        "Saldo Final",
        "Usuário",
        "Documento",
        "Observação"
    ];


    const rows =
        movements.map(m=>[

            dateTime(m.date),

            m.materialName,

            m.ncm,

            m.type,

            m.qty,

            m.previousQty,

            m.finalQty,

            m.userName,

            m.document || "",

            m.note || ""

        ]);


    const csv =
        [
            header,
            ...rows
        ]
        .map(row=>
            row
            .map(
                value =>
                    `"${String(value).replaceAll('"','""')}"`
            )
            .join(";")
        )
        .join("\n");


    downloadFile(
        "\uFEFF"+csv,
        `historico-almatech-${Date.now()}.csv`,
        "text/csv;charset=utf-8"
    );


    toast("Histórico exportado.");

}


/* =========================================================
   MODAIS
========================================================= */

function closeModal(id){

    document.getElementById(id)
        .classList.remove("open");

}


document.querySelectorAll(".modal")
    .forEach(modal=>{

        modal.addEventListener("click",event=>{

            if(event.target===modal){

                modal.classList.remove("open");

            }

        });

    });


/* =========================================================
   TOTAL DO MATERIAL
========================================================= */

function updateMaterialTotal(){

    const qty =
        Number(document.getElementById("mQty").value || 0);

    const value =
        Number(document.getElementById("mValue").value || 0);

    document.getElementById("materialTotal")
        .textContent=money(qty*value);

}


/* =========================================================
   LIMPEZA
========================================================= */

function clearAllData(){

    if(currentUser?.role!=="ADMIN"){

        toast(
            "Somente o administrador pode executar esta ação.",
            "error"
        );

        return;

    }


    if(
        !confirm(
            "ATENÇÃO: isso apagará materiais e movimentações locais. Continuar?"
        )
    )return;


    materials=[];
    movements=[];

    saveData();

    renderAll();

    toast("Dados operacionais apagados.");

}


/* =========================================================
   RENDER GLOBAL
========================================================= */

function renderAll(){

    renderDashboard();
    renderMaterials();
    renderMovementSelect();
    renderHistory();
    renderUsers();

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

/* =========================================================
   INICIALIZAÇÃO DO SISTEMA
========================================================= */

/*
    1. Carrega usuários, materiais, movimentações e NCM.
*/

loadData();


/*
    2. Tenta restaurar automaticamente a sessão anterior.

    Se o usuário estava logado antes de apertar F5,
    ele será levado diretamente para o sistema.
*/

restoreSession();


/*
    3. Carrega a base NCM somente se ainda não existir
       localmente.
*/

if(!Object.keys(ncmDatabase).length){

    loadNCMDatabase(false);

}


/* =========================================================
   ENTER NO LOGIN
========================================================= */

document.getElementById("loginPass")
    .addEventListener(
        "keydown",
        event => {

            if(event.key === "Enter"){

                login();

            }

        }
    );


/*
    Tenta carregar a base NCM somente quando ela ainda
    não estiver disponível localmente.


if(!Object.keys(ncmDatabase).length){

    loadNCMDatabase(false);

}


/* Enter no login

document.getElementById("loginPass")
    .addEventListener("keydown",event=>{

        if(event.key==="Enter"){

            login();

        }

    });
*/
