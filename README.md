# Vagas da Garagem

Mapa das vagas da garagem do prédio, com veículo de cada apartamento, vagas presas (quem está na frente) e vagas disponíveis para empréstimo.

- **Site:** estático, hospedado de graça no GitHub Pages.
- **Dados e login:** Firebase (Firestore + login com Google), no plano gratuito *Spark*. O plano gratuito não pausa por inatividade.

## Quem vê o quê

Versão **aberta**, sem login para moradores:

| Quem | Vê | Edita |
|---|---|---|
| Qualquer pessoa com o link | Mapa, veículos, nomes, vagas disponíveis | Veículo e disponibilidade de **qualquer** apartamento |
| Administrador (login Google no rodapé) | Tudo | Também a distribuição das vagas (rodízio) |

O morador abre o link, vai em **Minha unidade**, escolhe o apartamento, digita o nome e o veículo e salva. O celular lembra o apartamento e destaca a vaga no mapa.

**Vaga alugada:** cada vaga tem um carro. Quem aluga a vaga de outro apartamento cadastra o carro em *Minha unidade → Vagas alugadas*. No mapa, a vaga mostra o dono e quem usa. O dono vê o aviso e pode remover o aluguel quando ele acabar.

> Como é aberto, qualquer pessoa com o link pode alterar qualquer cadastro, e placas e nomes ficam visíveis para quem tiver o link. As regras do Firestore só validam o formato (placa com 7 caracteres, textos curtos). Para restringir no futuro, dá para adicionar um código por apartamento.

## Configuração (uma vez só)

### 1. Firebase
1. Acesse https://console.firebase.google.com e crie um projeto (pode desativar o Google Analytics).
2. Em **Build → Authentication → Get started**, ative o provedor **Google** (usado só pelo administrador).
3. Em **Build → Firestore Database → Create database**, escolha o modo de produção e a região `southamerica-east1` (São Paulo).
4. Na aba **Rules** do Firestore, cole o conteúdo de [firestore.rules](firestore.rules) e clique em **Publish**.
5. Em **Configurações do projeto → Seus apps**, adicione um app **Web (</>)**, copie o objeto `firebaseConfig` e cole em [firebase-config.js](firebase-config.js).

### 2. GitHub Pages
1. Faça o push deste repositório para o GitHub.
2. Em **Settings → Pages**, configure *Source: Deploy from a branch*, *Branch: `main` / root*.
3. O site fica em `https://<seu-usuario>.github.io/vagas-garagem/`.
4. No Firebase, em **Authentication → Settings → Authorized domains**, adicione `<seu-usuario>.github.io`.

### 3. Tornar-se administrador
1. Abra o site e clique em **Área do administrador**, no rodapé, para entrar com sua conta Google.
2. No Firebase, em **Authentication → Users**, copie o **User UID** da sua conta.
3. No **Firestore → Data**, crie a coleção `admins` com um documento cujo **ID é o seu UID**. Os campos não importam; pode ser `nome: "admin"`.
4. Recarregue o site. Aparece a aba **Distribuição**.

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

## Publicar mudanças
O GitHub Pages deixa os arquivos em cache por 10 minutos. Ao alterar `app.js`, `dados.js`, `styles.css` ou `firebase-config.js`, aumente o número `?v=` nas referências em `index.html` e `app.js` (ex.: `?v=4` → `?v=5`). Assim os celulares não misturam versão antiga e nova.
