-- Fast Street · Eventos (base do Feed UC-03, Mapa UC-04 e Inscrição UC-05).
-- Modelo da especificação, seção 11.1: LOCAL, EVENTO, EVENTO_CATEGORIA, INSCRICAO.

-- Locais autorizados (autódromos, pistas de arrancada, áreas privadas).
CREATE TABLE IF NOT EXISTS local (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  tipo_local  ENUM('autodromo','pista_arrancada','area_privada') NOT NULL,
  cidade_id   INT UNSIGNED NOT NULL,
  endereco    VARCHAR(255) NULL,
  latitude    DECIMAL(9,6) NOT NULL,
  longitude   DECIMAL(9,6) NOT NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_local_cidade (cidade_id),
  -- Caixa de busca (lat/lng) antes do cálculo exato de distância.
  KEY ix_local_geo (latitude, longitude),
  CONSTRAINT fk_local_cidade FOREIGN KEY (cidade_id) REFERENCES cidade (id),
  CONSTRAINT ck_local_lat CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ck_local_lng CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS evento (
  id              CHAR(36)          NOT NULL PRIMARY KEY,
  organizador_id  CHAR(36)          NOT NULL,
  local_id        CHAR(36)          NOT NULL,
  nome            VARCHAR(120)      NOT NULL,
  tipo            ENUM('td','arr','des','enc') NOT NULL COMMENT 'Track Day, Arrancada Autorizada, Desafio em Pista, Encontro',
  descricao       TEXT              NULL,
  regras          TEXT              NOT NULL,
  capa_upload_id  CHAR(36)          NULL,
  vagas_total     SMALLINT UNSIGNED NOT NULL,
  inicio_em       DATETIME(3)       NOT NULL COMMENT 'UTC',
  fim_em          DATETIME(3)       NULL,
  briefing_em     DATETIME(3)       NULL,
  visibilidade    ENUM('pub','priv') NOT NULL DEFAULT 'pub',
  status          ENUM('rascunho','aberto','andamento','encerrado','cancelado') NOT NULL DEFAULT 'rascunho',
  publicado_em    DATETIME(3)       NULL,
  cancelado_em    DATETIME(3)       NULL,
  created_at      DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_evento_status_inicio (status, inicio_em),
  KEY ix_evento_local (local_id),
  KEY ix_evento_organizador (organizador_id),
  CONSTRAINT fk_evento_organizador FOREIGN KEY (organizador_id) REFERENCES organizador (id),
  CONSTRAINT fk_evento_local       FOREIGN KEY (local_id)       REFERENCES local (id),
  CONSTRAINT fk_evento_capa        FOREIGN KEY (capa_upload_id) REFERENCES upload (id) ON DELETE SET NULL,
  CONSTRAINT ck_evento_vagas CHECK (vagas_total > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS evento_categoria (
  evento_id     CHAR(36)         NOT NULL,
  categoria_id  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (evento_id, categoria_id),
  CONSTRAINT fk_evcat_evento    FOREIGN KEY (evento_id)    REFERENCES evento (id) ON DELETE CASCADE,
  CONSTRAINT fk_evcat_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Inscrições. Já existe agora porque as vagas restantes do Feed dependem das confirmadas;
-- o fluxo de inscrição (UC-05) usa esta mesma tabela.
CREATE TABLE IF NOT EXISTS inscricao (
  id                 CHAR(36)          NOT NULL PRIMARY KEY,
  evento_id          CHAR(36)          NOT NULL,
  piloto_id          CHAR(36)          NOT NULL,
  veiculo_id         CHAR(36)          NOT NULL,
  categoria_id       TINYINT UNSIGNED  NOT NULL COMMENT 'Snapshot da categoria do veículo na inscrição',
  status             ENUM('pend','conf','rec','rem','canc','done') NOT NULL,
  regras_aceitas_em  DATETIME(3)       NOT NULL,
  motivo_recusa      VARCHAR(255)      NULL,
  decidida_em        DATETIME(3)       NULL,
  cancelada_em       DATETIME(3)       NULL,
  created_at         DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  -- Uma inscrição ativa (pendente ou confirmada) por piloto por evento (RN-INS-07).
  ativa_de           VARCHAR(73) GENERATED ALWAYS AS (IF(status IN ('pend','conf'), CONCAT(evento_id, ':', piloto_id), NULL)) STORED,
  UNIQUE KEY uk_inscricao_ativa (ativa_de),
  KEY ix_inscricao_evento_status (evento_id, status),
  KEY ix_inscricao_piloto (piloto_id),
  CONSTRAINT fk_inscricao_evento    FOREIGN KEY (evento_id)    REFERENCES evento (id),
  CONSTRAINT fk_inscricao_piloto    FOREIGN KEY (piloto_id)    REFERENCES usuario (id),
  CONSTRAINT fk_inscricao_veiculo   FOREIGN KEY (veiculo_id)   REFERENCES veiculo (id),
  CONSTRAINT fk_inscricao_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
