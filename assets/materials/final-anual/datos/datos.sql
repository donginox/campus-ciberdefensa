-- Copia lógica ficticia. Ejecutar solo en la base nueva final_anual.sqlite de tu carpeta de práctica.
-- No contiene conexiones externas, ATTACH, extensiones ni acceso a archivos ajenos.
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;
CREATE TABLE usuarios (
 id INTEGER PRIMARY KEY,
 cuenta TEXT NOT NULL UNIQUE,
 nombre TEXT NOT NULL,
 rol TEXT NOT NULL CHECK (rol IN ('estudiante','docente','operaciones','auditoria')),
 habilitada INTEGER NOT NULL CHECK (habilitada IN (0,1))
);
CREATE TABLE activos (
 id INTEGER PRIMARY KEY,
 hostname TEXT NOT NULL UNIQUE,
 sistema TEXT NOT NULL,
 ip TEXT NOT NULL UNIQUE,
 responsable_id INTEGER NOT NULL REFERENCES usuarios(id)
);
CREATE TABLE autenticaciones (
 id TEXT NOT NULL PRIMARY KEY,
 instante_utc TEXT NOT NULL,
 usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
 activo_id INTEGER NOT NULL REFERENCES activos(id),
 origen_ip TEXT NOT NULL,
 resultado TEXT NOT NULL CHECK (resultado IN ('success','failure'))
);
CREATE TABLE sesiones (
 id TEXT NOT NULL PRIMARY KEY,
 autenticacion_id TEXT NOT NULL UNIQUE REFERENCES autenticaciones(id),
 finalizada_utc TEXT
);
CREATE TABLE exportaciones (
 id TEXT NOT NULL PRIMARY KEY,
 sesion_id TEXT NOT NULL REFERENCES sesiones(id),
 instante_utc TEXT NOT NULL,
 registros INTEGER NOT NULL CHECK (registros >= 0),
 bytes INTEGER NOT NULL CHECK (bytes >= 0),
 referencia_solicitud TEXT
);
CREATE TABLE cambios (
 id TEXT NOT NULL PRIMARY KEY,
 activo_id INTEGER NOT NULL REFERENCES activos(id),
 solicitante_id INTEGER NOT NULL REFERENCES usuarios(id),
 ventana_inicio_utc TEXT NOT NULL,
 ventana_fin_utc TEXT NOT NULL,
 accion TEXT NOT NULL,
 estado TEXT NOT NULL
);
INSERT INTO usuarios VALUES
 (1,'lucia','Lucia Pereyra','estudiante',1),
 (2,'bruno','Bruno Salas','docente',1),
 (3,'soporte','Equipo Soporte','operaciones',1),
 (4,'auditor','Auditoria Interna','auditoria',1);
INSERT INTO activos VALUES
 (1,'WS-LUCIA','Windows 11','10.60.10.25',1),
 (2,'WS-BRUNO','Windows 11','10.60.10.26',2),
 (3,'PORTAL01','Linux','10.60.20.20',3),
 (4,'DB01','Linux','10.60.20.21',3),
 (5,'DNS01','Linux','10.60.30.10',3),
 (6,'ADMIN01','Windows 11','10.60.30.8',3);
INSERT INTO autenticaciones VALUES
 ('A001','2026-11-16T09:02:00Z',1,3,'10.60.10.25','success'),
 ('A002','2026-11-16T09:05:00Z',2,3,'10.60.10.26','success'),
 ('A003','2026-11-16T09:10:00Z',1,3,'203.0.113.44','failure'),
 ('A004','2026-11-16T09:11:00Z',1,3,'203.0.113.44','failure'),
 ('A005','2026-11-16T09:12:00Z',1,3,'203.0.113.44','success'),
 ('A006','2026-11-16T10:20:00Z',4,3,'10.60.30.8','success');
INSERT INTO sesiones VALUES
 ('S001','A001','2026-11-16T09:40:00Z'),
 ('S002','A002',NULL),
 ('S003','A005',NULL),
 ('S004','A006',NULL);
INSERT INTO exportaciones VALUES
 ('X001','S001','2026-11-16T09:03:00Z',12,24576,'SOL-101'),
 ('X002','S003','2026-11-16T09:13:00Z',120,245760,NULL),
 ('X003','S004','2026-11-16T10:21:00Z',10,20480,'AUD-11');
INSERT INTO cambios VALUES
 ('CHG-040',1,3,'2026-11-16T08:50:00Z','2026-11-16T09:10:00Z','revisar perfil de red','aprobado'),
 ('CHG-041',3,3,'2026-11-16T10:00:00Z','2026-11-16T10:15:00Z','actualizar portal y reiniciar servicio','aprobado');
COMMIT;
