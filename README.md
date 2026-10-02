# Vagas da Garagem

Mapa das vagas da garagem do prédio, com veículo de cada apartamento, vagas presas (quem está na frente) e vagas disponíveis para empréstimo.

- **Site:** estático, hospedado de graça no GitHub Pages.
- **Dados e login:** Firebase (Firestore + login com Google), no plano gratuito *Spark*. O plano gratuito não pausa por inatividade.

## Quem vê o quê

| Quem | Vê | Edita |
|---|---|---|
| Qualquer pessoa com o link | Mapa e apartamento de cada vaga | Nada |
| Morador aprovado | Veículos, nomes, vagas disponíveis | Só o veículo e a disponibilidade do **próprio** apartamento |
| Administrador | Tudo | Qualquer apartamento, aprovação de moradores, distribuição das vagas |

Fluxo do morador:
1. Entra com Google.
2. Informa o apartamento e o nome.
3. Espera o administrador aprovar na aba **Moradores**.

## Configuração (uma vez só)

### 1. Firebase
1. Acesse https://console.firebase.google.com e crie um projeto (pode desativar o Google Analytics).
2. Em **Build → Authentication → Get started**, ative o provedor **Google**.
3. Em **Build → Firestore Database → Create database**, escolha o modo de produção e a região `southamerica-east1` (São Paulo).
4. Na aba **Rules** do Firestore, cole o conteúdo de [firestore.rules](firestore.rules) e clique em **Publish**.
5. Em **Configurações do projeto → Seus apps**, adicione um app **Web (</>)**, copie o objeto `firebaseConfig` e cole em [firebase-config.js](firebase-config.js).

### 2. GitHub Pages
1. Faça o push deste repositório para o GitHub.
2. Em **Settings → Pages**, configure *Source: Deploy from a branch*, *Branch: `main` / root*.
3. O site fica em `https://<seu-usuario>.github.io/vagas-garagem/`.
4. No Firebase, em **Authentication → Settings → Authorized domains**, adicione `<seu-usuario>.github.io`.

### 3. Tornar-se administrador
1. Abra o site e entre com sua conta Google.
2. No Firebase, em **Authentication → Users**, copie o **User UID** da sua conta.
3. No **Firestore → Data**, crie a coleção `admins` com um documento cujo **ID é o seu UID**. Os campos não importam; pode ser `nome: "admin"`.
4. Recarregue o site. Aparecem as abas **Moradores** e **Distribuição**.

## Novo rodízio de vagas
Na aba **Distribuição** (somente admin), cole a lista nova (`Apto;Vaga` por linha), confira e salve. Todo mundo passa a ver a nova distribuição na hora.

Se quiser que a lista nova vire o padrão do código, atualize `RAW` e `DEFAULT_VIG` em [dados.js](dados.js).

## Mudanças no mapa
As posições das vagas estão em [dados.js](dados.js) (`slot(...)` e `pairRows(...)`). As vagas duplas são definidas por `pairRows(subsolo, fileiraDoFundo, fileiraDaFrente, ...)`.

## Rodar localmente
Módulos ES não funcionam abrindo o arquivo direto no navegador. Rode um servidor simples na pasta:

```
npx serve .
```

Também é preciso adicionar `localhost` em *Authorized domains* (o Firebase já costuma trazer).

## Custos
O plano Spark do Firebase é gratuito, com limite de 50 mil leituras e 20 mil gravações por dia, muito acima do uso de um prédio de 94 apartamentos. O GitHub Pages é gratuito para repositórios públicos.

> As placas e os nomes ficam no Firestore, protegidos pelas regras. O repositório público contém só o código, o mapa e a distribuição das vagas.
